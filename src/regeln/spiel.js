// Spielzustand und Aktionen des Regelkerns.
//
// Der Zustand ist ein einfaches, JSON-taugliches Objekt. Jede Aktion nimmt den
// bisherigen Zustand und liefert einen neuen zurück; der alte bleibt unverändert.
// Regelwidrige Aktionen werfen einen RegelFehler.
//
// Ablauf einer Runde (Phasen):
//   produktion      Produktion wird beim Betreten automatisch ausgegeben
//   handel          Tauschen und Verhandeln
//   politik         ab Runde 2: Beschlüsse, Gemeinschaftsvorrat
//   betriebskosten  Betriebskosten werden beim Betreten automatisch abgebucht
//   ereignis        Krankheitskarte, Ereignisse, Bezahlungen
//   abrechnung      Stabilität wird beim Betreten verbucht
// Vor der ersten Runde steht der Zustand auf Phase "start".

import { CONFIG } from './config.js';
import { RegelFehler } from './fehler.js';
import {
  MARKER_ARTEN,
  addiere,
  istLeer,
  kleinere,
  leer,
  marker,
  positiv,
  reicht,
  subtrahiere,
  summe,
  text,
} from './marker.js';
import { berechneStufe, produktionsMenge } from './stufen.js';
import { bewertung, verbuche } from './stabilitaet.js';

const GRUPPEN_IDS = Object.keys(CONFIG.gruppen);
const AKTIONS_PHASEN = ['produktion', 'handel', 'politik', 'betriebskosten', 'ereignis'];
const TAUSCH_PHASEN = ['handel', 'politik', 'ereignis'];

// ---------------------------------------------------------------- Hilfen

const klon = (zustand) => structuredClone(zustand);
const gruppenName = (id) => CONFIG.gruppen[id].name;

function pruefeLaeuft(s) {
  if (s.status !== 'laeuft') throw new RegelFehler('Das Spiel ist beendet.');
}

function pruefePhase(s, erlaubt, was) {
  pruefeLaeuft(s);
  if (!erlaubt.includes(s.phase)) {
    throw new RegelFehler(`${was} ist in dieser Phase nicht möglich.`);
  }
}

function pruefeGruppe(id) {
  if (!CONFIG.gruppen[id]) throw new RegelFehler(`Unbekannte Gruppe: ${id}`);
}

function logge(s, art, daten = {}) {
  s.protokoll.push({ runde: s.runde, phase: s.phase, art, ...daten });
}

/** Würfel 1..6 mit kryptografischem Zufall (läuft in Node und im Browser). */
export function standardWuerfel() {
  const grenze = 4294967292; // größtes Vielfaches von 6 unter 2^32, vermeidet Verzerrung
  const puffer = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(puffer);
  } while (puffer[0] >= grenze);
  return (puffer[0] % 6) + 1;
}

/**
 * Zieht Marker aus den Beständen der Gruppen ab ("zahlbar aus beliebigen Beständen").
 * - mit verteilung ({ gruppeId: Marker }): genau diese Marker, sonst RegelFehler
 * - ohne verteilung: automatisch, je Markerart zuerst aus dem größten Bestand
 * Gibt die tatsächlich gezahlten Marker zurück. Ein Beschluss ersetzt keine Marker:
 * Was nicht vorhanden ist, kann nicht gezahlt werden.
 */
function zahle(s, soll, verteilung) {
  const gezahlt = leer();
  if (verteilung) {
    let gesamt = leer();
    for (const [id, roh] of Object.entries(verteilung)) {
      pruefeGruppe(id);
      const teil = marker(roh);
      if (!reicht(s.gruppen[id].bestand, teil)) {
        throw new RegelFehler(
          `${gruppenName(id)} hat nicht genug Marker (verlangt: ${text(teil)}, vorhanden: ${text(s.gruppen[id].bestand)}).`,
        );
      }
      gesamt = addiere(gesamt, teil);
    }
    if (!istLeer(positiv(subtrahiere(gesamt, soll)))) {
      throw new RegelFehler(`Zu viel gezahlt (verlangt: ${text(soll)}, angeboten: ${text(gesamt)}).`);
    }
    for (const [id, roh] of Object.entries(verteilung)) {
      s.gruppen[id].bestand = subtrahiere(s.gruppen[id].bestand, marker(roh));
    }
    return gesamt;
  }
  for (const art of MARKER_ARTEN) {
    let offen = soll[art] ?? 0;
    const reihenfolge = [...GRUPPEN_IDS].sort(
      (a, b) => s.gruppen[b].bestand[art] - s.gruppen[a].bestand[art],
    );
    for (const id of reihenfolge) {
      if (offen <= 0) break;
      const nimm = Math.min(offen, s.gruppen[id].bestand[art]);
      s.gruppen[id].bestand[art] -= nimm;
      gezahlt[art] += nimm;
      offen -= nimm;
    }
  }
  return gezahlt;
}

// ---------------------------------------------------------------- Neues Spiel

export function neuesSpiel({ variante = 'voll' } = {}) {
  const v = CONFIG.varianten[variante];
  if (!v) throw new RegelFehler(`Unbekannte Variante: ${variante}`);

  const gruppen = {};
  for (const id of GRUPPEN_IDS) {
    gruppen[id] = {
      bestand: marker(CONFIG.gruppen[id].start),
      stufe: 1,
      letzteProduktion: leer(),
      betriebskosten: { bezahlt: leer(), unbezahlt: 0 },
    };
  }

  const ereignisse = {};
  for (const [id, runde] of Object.entries(v.ereignisse)) {
    const basis = { runde, aktiv: false };
    if (id === 'letzterFilter') {
      ereignisse[id] = {
        ...basis,
        ausgeloestInRunde: null,
        verloren: leer(),
        bezahlt: leer(),
        repariert: false,
        strafeVerbucht: false,
      };
    } else if (id === 'fremde') {
      ereignisse[id] = {
        ...basis,
        entscheidung: null,
        wurf: null, // verdeckt bis zur Abrechnung, siehe oeffentlicheSicht()
        bezahlt: leer(),
        aufgeloest: false,
        aufgedeckt: false,
        ergebnis: null, // 'wahrheit' | 'seuche'
      };
    } else if (id === 'notstand') {
      ereignisse[id] = { ...basis, beschluss: null };
    }
  }

  return {
    variante,
    runde: 0,
    phase: 'start',
    status: 'laeuft', // 'laeuft' | 'beendet' | 'zerfallen'
    stabilitaet: CONFIG.stabilitaet.start,
    gruppen,
    gemeinschaftsvorrat: { eingerichtet: false, verwalter: null, ordnung: '', bestand: leer() },
    ereignisse,
    krankheitskarte: null,
    buchungen: [], // Stabilitätsbuchungen der laufenden Runde (z. B. Zwangsmaßnahme)
    zwangsmassnahme: { eingesetzt: false },
    geheimkarten: Object.fromEntries(GRUPPEN_IDS.map((id) => [id, { erfuellt: null }])),
    abrechnungen: [],
    protokoll: [],
  };
}

// ---------------------------------------------------------------- Phasen

export function naechstePhase(zustand) {
  pruefeLaeuft(zustand);
  const s = klon(zustand);
  switch (s.phase) {
    case 'start':
      betreteRunde(s, 1);
      break;
    case 'produktion':
      s.phase = 'handel';
      break;
    case 'handel':
      if (s.runde >= CONFIG.runde.politikAbRunde) {
        s.phase = 'politik';
      } else {
        s.phase = 'betriebskosten';
        buchBetriebskosten(s);
      }
      break;
    case 'politik':
      s.phase = 'betriebskosten';
      buchBetriebskosten(s);
      break;
    case 'betriebskosten':
      s.phase = 'ereignis';
      betreteEreignisPhase(s);
      break;
    case 'ereignis':
      s.phase = 'abrechnung';
      rechneAb(s);
      break;
    case 'abrechnung':
      betreteRunde(s, s.runde + 1);
      break;
  }
  return s;
}

function aktiviereEreignisse(s, zeitpunkt) {
  const v = CONFIG.varianten[s.variante];
  for (const [id, runde] of Object.entries(v.ereignisse)) {
    const cfg = CONFIG.ereignisse[id];
    if (runde !== s.runde || cfg.zeitpunkt !== zeitpunkt) continue;
    const e = s.ereignisse[id];
    e.aktiv = true;
    logge(s, 'ereignis', { id, titel: cfg.titel });
    if (id === 'letzterFilter') {
      e.ausgeloestInRunde = s.runde;
      const betroffen = s.gruppen[cfg.gruppe];
      e.verloren = kleinere(betroffen.bestand, marker(cfg.verlust));
      betroffen.bestand = subtrahiere(betroffen.bestand, e.verloren);
    }
  }
}

function betreteRunde(s, runde) {
  s.runde = runde;
  s.phase = 'produktion';
  s.buchungen = [];
  s.krankheitskarte = null;
  aktiviereEreignisse(s, 'rundenanfang');

  const filter = s.ereignisse.letzterFilter;
  const notstand = s.ereignisse.notstand;
  const filterDefekt = Boolean(filter && filter.aktiv && !filter.repariert);
  const notstandGilt = Boolean(notstand && notstand.aktiv && notstand.runde === runde);
  for (const id of GRUPPEN_IDS) {
    const g = s.gruppen[id];
    const menge = produktionsMenge(id, { stufe: g.stufe, filterDefekt, notstand: notstandGilt });
    const gut = CONFIG.gruppen[id].gut;
    g.letzteProduktion = marker({ [gut]: menge });
    g.bestand = addiere(g.bestand, g.letzteProduktion);
  }
  logge(s, 'produktion');
}

function buchBetriebskosten(s) {
  for (const id of GRUPPEN_IDS) {
    const g = s.gruppen[id];
    const kosten = marker(CONFIG.gruppen[id].betriebskosten);
    const bezahlt = kleinere(g.bestand, kosten);
    g.bestand = subtrahiere(g.bestand, bezahlt);
    const unbezahlt = summe(subtrahiere(kosten, bezahlt));
    g.betriebskosten = { bezahlt, unbezahlt };
    g.stufe = berechneStufe(id, unbezahlt);
    logge(s, 'betriebskosten', { gruppe: id, bezahlt, unbezahlt, stufe: g.stufe });
  }
}

function betreteEreignisPhase(s) {
  const kosten = CONFIG.varianten[s.variante].krankheitskarten[s.runde - 1];
  s.krankheitskarte = { kosten, bezahlt: 0, vollstaendig: false };
  logge(s, 'krankheitskarte', { kosten });
  aktiviereEreignisse(s, 'rundenende');
}

function rechneAb(s) {
  const ae = CONFIG.stabilitaet.aenderungen;
  const buchungen = [];

  // Stufen
  const stufen = Object.fromEntries(GRUPPEN_IDS.map((id) => [id, s.gruppen[id].stufe]));
  if (GRUPPEN_IDS.every((id) => stufen[id] === 1)) {
    buchungen.push({ grund: 'Alle Gruppen in Stufe 1', delta: ae.alleGruppenStufe1 });
  }
  for (const id of GRUPPEN_IDS) {
    if (stufen[id] === 3) {
      buchungen.push({ grund: `${gruppenName(id)} in Stufe 3 (Stillstand)`, delta: ae.jeGruppeStufe3 });
    }
  }

  // Krankheitskarte: was noch offen ist, wird automatisch aus den Beständen bezahlt
  const k = s.krankheitskarte;
  if (k.bezahlt < k.kosten) k.bezahlt += zahle(s, marker({ M: k.kosten - k.bezahlt })).M;
  k.vollstaendig = k.bezahlt >= k.kosten;
  if (!k.vollstaendig) {
    buchungen.push({ grund: 'Krankheitskarte nicht vollständig bezahlt', delta: ae.krankheitskarteUnbezahlt });
  }

  // Ereignisse
  const filter = s.ereignisse.letzterFilter;
  if (filter && filter.aktiv && !filter.repariert && !filter.strafeVerbucht) {
    const frist = CONFIG.ereignisse.letzterFilter.fristRunden;
    if (s.runde >= filter.ausgeloestInRunde + frist) {
      filter.strafeVerbucht = true;
      buchungen.push({
        grund: `„${CONFIG.ereignisse.letzterFilter.titel}“ nicht rechtzeitig repariert`,
        delta: ae.ereignisUnerfuellt,
      });
    }
  }

  const fremde = s.ereignisse.fremde;
  if (fremde && fremde.aktiv && fremde.runde === s.runde && !fremde.aufgeloest) {
    fremde.aufgeloest = true;
    loeseFremdeAuf(s, fremde, buchungen);
  }

  const notstand = s.ereignisse.notstand;
  if (notstand && notstand.aktiv && notstand.runde === s.runde && !notstand.beschluss) {
    buchungen.push({
      grund: `„${CONFIG.ereignisse.notstand.titel}“ nicht verbindlich entschieden`,
      delta: ae.ereignisUnerfuellt,
    });
  }

  buchungen.push(...s.buchungen);

  const vorher = s.stabilitaet;
  s.stabilitaet = verbuche(vorher, buchungen);
  s.abrechnungen.push({
    runde: s.runde,
    stabilitaetVorher: vorher,
    stabilitaetNachher: s.stabilitaet,
    bewertung: bewertung(s.stabilitaet),
    buchungen,
    stufen,
    krankheitskarte: { ...k },
  });
  logge(s, 'abrechnung', { vorher, nachher: s.stabilitaet, buchungen });

  if (s.stabilitaet <= 0) s.status = 'zerfallen';
  else if (s.runde >= CONFIG.varianten[s.variante].runden) s.status = 'beendet';
}

function loeseFremdeAuf(s, fremde, buchungen) {
  const cfg = CONFIG.ereignisse.fremde;
  const ae = CONFIG.stabilitaet.aenderungen;
  if (!fremde.entscheidung) {
    buchungen.push({ grund: `„${cfg.titel}“ nicht entschieden`, delta: ae.ereignisUnerfuellt });
    return;
  }
  const option = cfg.optionen[fremde.entscheidung];
  fremde.aufgedeckt = true;
  const wahrheit = fremde.wurf <= cfg.wahrheitBis;
  fremde.ergebnis = wahrheit ? 'wahrheit' : 'seuche';

  if (!istLeer(positiv(subtrahiere(marker(option.kosten), fremde.bezahlt)))) {
    buchungen.push({ grund: `„${cfg.titel}“: Kosten nicht bezahlt`, delta: ae.ereignisUnerfuellt });
  }
  if (fremde.entscheidung === 'ablehnen') return; // gewürfelt wird nur zur Auflösung

  if (wahrheit) {
    // Die Konferenz entscheidet über die Verteilung; der Vorrat ist damit nutzbar,
    // auch wenn noch kein Verwalter festgelegt wurde.
    s.gemeinschaftsvorrat.eingerichtet = true;
    s.gemeinschaftsvorrat.bestand = addiere(
      s.gemeinschaftsvorrat.bestand,
      marker(cfg.wahrheit.gemeinschaftsvorrat),
    );
  } else {
    const { stabilitaet = 0, ...kosten } = option.seuche;
    const soll = marker(kosten);
    const gezahlt = zahle(s, soll);
    logge(s, 'seuche', { soll, gezahlt });
    if (stabilitaet !== 0) {
      buchungen.push({ grund: 'Fremde ohne Quarantäne aufgenommen, Seuche', delta: stabilitaet });
    }
  }
}

// ---------------------------------------------------------------- Handel

/**
 * Tausch, Geschenk oder Rückgabe zwischen zwei Gruppen.
 * a gibt gibtA an b, b gibt gibtB an a (gibtB darf leer sein: Geschenk).
 * Verleihen sind zwei Übertragungen hintereinander.
 */
export function tausche(zustand, { a, b, gibtA = {}, gibtB = {} }) {
  pruefePhase(zustand, TAUSCH_PHASEN, 'Handel');
  pruefeGruppe(a);
  pruefeGruppe(b);
  if (a === b) throw new RegelFehler('Eine Gruppe kann nicht mit sich selbst handeln.');
  const ausA = marker(gibtA);
  const ausB = marker(gibtB);
  if (istLeer(ausA) && istLeer(ausB)) throw new RegelFehler('Es werden keine Marker übertragen.');
  const s = klon(zustand);
  if (!reicht(s.gruppen[a].bestand, ausA)) {
    throw new RegelFehler(`${gruppenName(a)} hat nicht genug Marker (${text(ausA)}).`);
  }
  if (!reicht(s.gruppen[b].bestand, ausB)) {
    throw new RegelFehler(`${gruppenName(b)} hat nicht genug Marker (${text(ausB)}).`);
  }
  s.gruppen[a].bestand = addiere(subtrahiere(s.gruppen[a].bestand, ausA), ausB);
  s.gruppen[b].bestand = addiere(subtrahiere(s.gruppen[b].bestand, ausB), ausA);
  logge(s, 'tausch', { a, b, gibtA: ausA, gibtB: ausB });
  return s;
}

// ---------------------------------------------------------------- Gemeinschaftsvorrat

export function gemeinschaftEinrichten(zustand, { verwalter, ordnung = '' }) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Gemeinschaftsvorrat');
  pruefeGruppe(verwalter);
  if (zustand.gemeinschaftsvorrat.verwalter) {
    throw new RegelFehler('Der Gemeinschaftsvorrat ist bereits eingerichtet.');
  }
  const s = klon(zustand);
  Object.assign(s.gemeinschaftsvorrat, { eingerichtet: true, verwalter, ordnung });
  logge(s, 'gemeinschaftsvorrat', { verwalter, ordnung });
  return s;
}

export function gemeinschaftEinzahlen(zustand, gruppe, menge) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Einzahlen');
  pruefeGruppe(gruppe);
  if (!zustand.gemeinschaftsvorrat.eingerichtet) {
    throw new RegelFehler('Es gibt noch keinen Gemeinschaftsvorrat.');
  }
  const m = marker(menge);
  const s = klon(zustand);
  if (!reicht(s.gruppen[gruppe].bestand, m)) {
    throw new RegelFehler(`${gruppenName(gruppe)} hat nicht genug Marker (${text(m)}).`);
  }
  s.gruppen[gruppe].bestand = subtrahiere(s.gruppen[gruppe].bestand, m);
  s.gemeinschaftsvorrat.bestand = addiere(s.gemeinschaftsvorrat.bestand, m);
  logge(s, 'einzahlung', { gruppe, menge: m });
  return s;
}

export function gemeinschaftAuszahlen(zustand, gruppe, menge) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Auszahlen');
  pruefeGruppe(gruppe);
  if (!zustand.gemeinschaftsvorrat.eingerichtet) {
    throw new RegelFehler('Es gibt noch keinen Gemeinschaftsvorrat.');
  }
  const m = marker(menge);
  const s = klon(zustand);
  if (!reicht(s.gemeinschaftsvorrat.bestand, m)) {
    throw new RegelFehler(`Im Gemeinschaftsvorrat sind nicht genug Marker (${text(m)}).`);
  }
  s.gemeinschaftsvorrat.bestand = subtrahiere(s.gemeinschaftsvorrat.bestand, m);
  s.gruppen[gruppe].bestand = addiere(s.gruppen[gruppe].bestand, m);
  logge(s, 'auszahlung', { gruppe, menge: m });
  return s;
}

// ---------------------------------------------------------------- Krankheitskarte und Ereignisse

/**
 * Krankheitskarte bezahlen (aus beliebigen Beständen).
 * verteilung: { gruppeId: AnzahlMedikamente } oder weglassen für automatisch.
 * Wird bis zur Abrechnung nicht vollständig bezahlt, holt die Abrechnung den Rest
 * automatisch aus den vorhandenen Beständen.
 */
export function krankheitskarteBezahlen(zustand, verteilung) {
  pruefePhase(zustand, ['ereignis'], 'Die Krankheitskarte zu bezahlen');
  const s = klon(zustand);
  const k = s.krankheitskarte;
  const offen = k.kosten - k.bezahlt;
  if (offen <= 0) throw new RegelFehler('Die Krankheitskarte ist bereits bezahlt.');
  const rohVerteilung = verteilung
    ? Object.fromEntries(Object.entries(verteilung).map(([id, n]) => [id, { M: n }]))
    : undefined;
  const gezahlt = zahle(s, marker({ M: offen }), rohVerteilung);
  k.bezahlt += gezahlt.M;
  k.vollstaendig = k.bezahlt >= k.kosten;
  logge(s, 'krankheitskarte_bezahlt', { gezahlt: gezahlt.M });
  return s;
}

/**
 * Kosten eines Ereignisses an die Bank zahlen: Reparatur beim "letzten Filter",
 * Aufnahmekosten bei den "Unbekannten im Tunnel".
 * verteilung: { gruppeId: Marker } oder weglassen für automatisch. Teilzahlungen sind möglich.
 */
export function ereignisBezahlen(zustand, id, verteilung) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Bezahlen');
  const e = zustand.ereignisse[id];
  if (!e || !e.aktiv) throw new RegelFehler('Dieses Ereignis ist nicht aktiv.');
  let kosten;
  if (id === 'letzterFilter') {
    if (e.repariert) throw new RegelFehler('Der Filter ist bereits repariert.');
    kosten = marker(CONFIG.ereignisse.letzterFilter.reparatur);
  } else if (id === 'fremde') {
    if (e.runde !== zustand.runde) throw new RegelFehler('Das Ereignis gehört zu einer anderen Runde.');
    if (!e.entscheidung) throw new RegelFehler('Die Konferenz hat noch nicht entschieden.');
    kosten = marker(CONFIG.ereignisse.fremde.optionen[e.entscheidung].kosten);
  } else {
    throw new RegelFehler('Dieses Ereignis kostet nichts.');
  }
  const offen = positiv(subtrahiere(kosten, e.bezahlt));
  if (istLeer(offen)) throw new RegelFehler('Es ist nichts mehr zu bezahlen.');

  const s = klon(zustand);
  const se = s.ereignisse[id];
  const gezahlt = zahle(s, offen, verteilung);
  se.bezahlt = addiere(se.bezahlt, gezahlt);
  if (id === 'letzterFilter' && istLeer(positiv(subtrahiere(kosten, se.bezahlt)))) {
    se.repariert = true;
  }
  logge(s, 'ereignis_bezahlt', { id, gezahlt });
  return s;
}

/**
 * Entscheidung der Konferenz bei "Unbekannte im Tunnel": 'ablehnen',
 * 'mitQuarantaene' oder 'ohneQuarantaene'. Die Entscheidung ist verbindlich.
 * Es wird sofort gewürfelt, das Ergebnis bleibt bis zur Abrechnung verdeckt.
 * wuerfel: Funktion, die 1..6 liefert (für Tests austauschbar).
 */
export function fremdeEntscheiden(zustand, entscheidung, { wuerfel = standardWuerfel } = {}) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Die Entscheidung');
  const e = zustand.ereignisse.fremde;
  if (!e || !e.aktiv || e.runde !== zustand.runde) {
    throw new RegelFehler('„Unbekannte im Tunnel“ ist in dieser Runde nicht aktiv.');
  }
  if (e.entscheidung) throw new RegelFehler('Die Konferenz hat bereits verbindlich entschieden.');
  if (!CONFIG.ereignisse.fremde.optionen[entscheidung]) {
    throw new RegelFehler(`Unbekannte Entscheidung: ${entscheidung}`);
  }
  const wurf = wuerfel();
  if (!Number.isInteger(wurf) || wurf < 1 || wurf > 6) throw new RegelFehler(`Ungültiger Wurf: ${wurf}`);
  const s = klon(zustand);
  s.ereignisse.fremde.entscheidung = entscheidung;
  s.ereignisse.fremde.wurf = wurf;
  logge(s, 'entscheidung', { id: 'fremde', entscheidung }); // Wurf bewusst nicht im Protokoll
  return s;
}

/** Konferenzbeschluss zum Notstand: wer entscheidet, wie lange, wer kontrolliert. */
export function notstandBeschliessen(zustand, beschluss) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Der Beschluss');
  const e = zustand.ereignisse.notstand;
  if (!e || !e.aktiv || e.runde !== zustand.runde) {
    throw new RegelFehler('„Der Notstand“ ist in dieser Runde nicht aktiv.');
  }
  if (e.beschluss) throw new RegelFehler('Der Beschluss steht bereits fest.');
  const norm = {};
  for (const feld of CONFIG.ereignisse.notstand.beschlussFelder) {
    const wert = String(beschluss?.[feld] ?? '').trim();
    if (!wert) throw new RegelFehler(`Im Beschluss fehlt die Angabe „${feld}“.`);
    norm[feld] = wert;
  }
  const s = klon(zustand);
  s.ereignisse.notstand.beschluss = norm;
  logge(s, 'beschluss', { id: 'notstand', beschluss: norm });
  return s;
}

// ---------------------------------------------------------------- Zwangsmaßnahme

/**
 * Zwangsmaßnahme der Wächter: einmal pro Spiel bis zu 2 Marker einer anderen Gruppe
 * einziehen. Ohne Konferenzbeschluss kostet das in der Abrechnung Stabilität.
 */
export function zwangsmassnahme(zustand, { ziel, menge, konferenzbeschluss = false }) {
  pruefePhase(zustand, AKTIONS_PHASEN, 'Die Zwangsmaßnahme');
  const cfg = CONFIG.zwangsmassnahme;
  pruefeGruppe(ziel);
  if (ziel === cfg.gruppe) throw new RegelFehler('Die Wächter können sich nicht selbst treffen.');
  if (zustand.zwangsmassnahme.eingesetzt) {
    throw new RegelFehler('Die Zwangsmaßnahme wurde in diesem Spiel schon eingesetzt.');
  }
  const m = marker(menge);
  if (summe(m) < 1 || summe(m) > cfg.maxMarker) {
    throw new RegelFehler(`Es dürfen 1 bis ${cfg.maxMarker} Marker eingezogen werden.`);
  }
  if (!reicht(zustand.gruppen[ziel].bestand, m)) {
    throw new RegelFehler(`${gruppenName(ziel)} hat nicht genug Marker (${text(m)}).`);
  }
  const s = klon(zustand);
  s.gruppen[ziel].bestand = subtrahiere(s.gruppen[ziel].bestand, m);
  s.gruppen[cfg.gruppe].bestand = addiere(s.gruppen[cfg.gruppe].bestand, m);
  s.zwangsmassnahme = { eingesetzt: true, ziel, menge: m, konferenzbeschluss, runde: s.runde };
  if (!konferenzbeschluss) {
    s.buchungen.push({
      grund: 'Zwangsmaßnahme ohne Konferenzbeschluss',
      delta: CONFIG.stabilitaet.aenderungen.zwangsmassnahmeOhneBeschluss,
    });
  }
  logge(s, 'zwangsmassnahme', { ziel, menge: m, konferenzbeschluss });
  return s;
}

// ---------------------------------------------------------------- Auswertung

/** Lehrkraft wertet aus, ob eine Gruppe ihre Geheimkarte erfüllt hat (erst nach Spielende). */
export function geheimkarteWerten(zustand, gruppe, erfuellt) {
  pruefeGruppe(gruppe);
  if (zustand.status === 'laeuft') {
    throw new RegelFehler('Geheimkarten werden erst nach Spielende ausgewertet.');
  }
  const s = klon(zustand);
  s.geheimkarten[gruppe].erfuellt = Boolean(erfuellt);
  logge(s, 'geheimkarte', { gruppe, erfuellt: Boolean(erfuellt) });
  return s;
}

/** Endstand mit Bewertung und Gruppenpunkten aus den Geheimkarten. */
export function auswertung(zustand) {
  const cfg = CONFIG.geheimkarten;
  const zaehlt = zustand.stabilitaet >= cfg.minStabilitaet;
  const gruppenpunkte = {};
  for (const id of GRUPPEN_IDS) {
    gruppenpunkte[id] = zaehlt && zustand.geheimkarten[id].erfuellt === true ? cfg.punkte : 0;
  }
  return {
    status: zustand.status,
    stabilitaet: zustand.stabilitaet,
    bewertung: bewertung(zustand.stabilitaet),
    zerfall: zustand.stabilitaet <= 0,
    gruppenpunkte,
  };
}

/**
 * Sicht für Gruppen: verdeckte Informationen (Würfel der Fremden bis zur Abrechnung,
 * Geheimkarten-Wertung bis zum Spielende) werden entfernt.
 */
export function oeffentlicheSicht(zustand) {
  const s = klon(zustand);
  const fremde = s.ereignisse.fremde;
  if (fremde && !fremde.aufgedeckt) {
    fremde.wurf = null;
    fremde.ergebnis = null;
  }
  if (s.status === 'laeuft') {
    for (const id of GRUPPEN_IDS) s.geheimkarten[id].erfuellt = null;
  }
  return s;
}

/** Summe aller Bestände der Gruppen (ohne Gemeinschaftsvorrat). */
export function gesamtBestand(zustand) {
  return GRUPPEN_IDS.reduce((summeAlle, id) => addiere(summeAlle, zustand.gruppen[id].bestand), leer());
}
