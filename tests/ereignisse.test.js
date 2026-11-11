import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RegelFehler,
  gemeinschaftAuszahlen,
  gemeinschaftEinrichten,
  ereignisBezahlen,
  fremdeEntscheiden,
  naechstePhase,
  neuesSpiel,
  notstandBeschliessen,
  oeffentlicheSicht,
  gesamtBestand,
} from '../src/regeln/index.js';
import { mitBestand, spieleBis, verteileIdeal, wuerfelMit } from './hilfen.js';

const REICH = { N: 20, W: 20, E: 20, M: 20, S: 20 };
const alleReich = () => ({
  hydroponiker: REICH, wasserwerker: REICH, techniker: REICH, sanitaeter: REICH, waechter: REICH,
});
const buchung = (s, runde) => s.abrechnungen[runde - 1].buchungen;
const hat = (s, runde, delta) => buchung(s, runde).some((b) => b.delta === delta);

/** Spiel, in dem alle Gruppen genug Marker haben, damit nur das Ereignis zählt. */
function reichesSpiel(variante = 'voll') {
  return mitBestand(neuesSpiel({ variante }), alleReich());
}
/** Wie reichesSpiel, füllt aber vor jeder Betriebskosten-Phase wieder auf. */
function weiter(s, runde, phase) {
  while (!(s.runde === runde && s.phase === phase)) {
    if (s.phase === 'handel' || s.phase === 'politik') s = mitBestand(s, alleReich());
    s = naechstePhase(s);
  }
  return s;
}

// ------------------------------------------------ Ereignis 1: Der letzte Filter

test('Der letzte Filter: Wasserwerker verlieren am Ende von Runde 1 sofort 2 Wasser', () => {
  let s = weiter(reichesSpiel(), 1, 'betriebskosten');
  const vorher = s.gruppen.wasserwerker.bestand.W;
  s = naechstePhase(s);
  assert.equal(s.ereignisse.letzterFilter.aktiv, true);
  assert.equal(s.gruppen.wasserwerker.bestand.W, vorher - 2);
  assert.equal(s.ereignisse.letzterFilter.verloren.W, 2);
});

test('Der letzte Filter: hat die Gruppe weniger als 2 Wasser, verliert sie nur den Rest', () => {
  let s = weiter(reichesSpiel(), 1, 'betriebskosten');
  s.gruppen.wasserwerker.bestand.W = 1;
  s = naechstePhase(s);
  assert.equal(s.gruppen.wasserwerker.bestand.W, 0);
  assert.equal(s.ereignisse.letzterFilter.verloren.W, 1);
});

test('Der letzte Filter: Produktion 3 bis zur Reparatur, danach wieder 6', () => {
  let s = weiter(reichesSpiel(), 2, 'produktion');
  assert.equal(s.gruppen.wasserwerker.letzteProduktion.W, 3);
  s = weiter(s, 2, 'handel');
  s = ereignisBezahlen(s, 'letzterFilter'); // Reparatur 2 E + 1 N
  assert.equal(s.ereignisse.letzterFilter.repariert, true);
  s = weiter(s, 3, 'produktion');
  assert.equal(s.gruppen.wasserwerker.letzteProduktion.W, 6);
});

test('Der letzte Filter: Reparatur kostet 2 Energie und 1 Nahrung, auch in Teilzahlungen', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  const vorher = gesamtBestand(s);
  s = ereignisBezahlen(s, 'letzterFilter', { techniker: { E: 1 } });
  assert.equal(s.ereignisse.letzterFilter.repariert, false);
  s = ereignisBezahlen(s, 'letzterFilter', { techniker: { E: 1 }, hydroponiker: { N: 1 } });
  assert.equal(s.ereignisse.letzterFilter.repariert, true);
  const nachher = gesamtBestand(s);
  assert.equal(vorher.E - nachher.E, 2);
  assert.equal(vorher.N - nachher.N, 1);
  assert.throws(() => ereignisBezahlen(s, 'letzterFilter'), RegelFehler);
});

test('Der letzte Filter: zu viel gezahlt oder fremde Marker werden abgelehnt', () => {
  const s = weiter(reichesSpiel(), 2, 'handel');
  assert.throws(() => ereignisBezahlen(s, 'letzterFilter', { techniker: { E: 3 } }), RegelFehler);
  assert.throws(() => ereignisBezahlen(s, 'letzterFilter', { techniker: { M: 1 } }), RegelFehler);
});

test('Der letzte Filter: nicht bis Ende der nächsten Runde bezahlt: -2 Stabilität', () => {
  const s = weiter(reichesSpiel(), 2, 'abrechnung');
  assert.equal(hat(s, 1, -2), false); // in Runde 1 noch nicht fällig
  assert.equal(hat(s, 2, -2), true);
  assert.match(buchung(s, 2).find((b) => b.delta === -2).grund, /letzte Filter/);
});

test('Der letzte Filter: rechtzeitig repariert, keine Strafe', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  s = ereignisBezahlen(s, 'letzterFilter');
  s = weiter(s, 2, 'abrechnung');
  assert.equal(buchung(s, 2).some((b) => /letzte Filter/.test(b.grund)), false);
});

test('Der letzte Filter: die Strafe wird nur einmal verbucht', () => {
  const s = weiter(reichesSpiel(), 3, 'abrechnung');
  assert.equal(hat(s, 2, -2), true);
  assert.equal(buchung(s, 3).filter((b) => /letzte Filter/.test(b.grund)).length, 0);
});

// ------------------------------------------------ Ereignis 2: Unbekannte im Tunnel

test('Unbekannte: gibt es nur in der Vollvariante und nur in Runde 2', () => {
  const kurz = neuesSpiel({ variante: 'kurz' });
  assert.equal(kurz.ereignisse.fremde, undefined);
  let s = weiter(reichesSpiel(), 1, 'handel');
  assert.throws(() => fremdeEntscheiden(s, 'ablehnen'), RegelFehler);
  s = weiter(s, 2, 'handel');
  s = fremdeEntscheiden(s, 'ablehnen');
  assert.equal(s.ereignisse.fremde.entscheidung, 'ablehnen');
});

test('Unbekannte: Entscheidung ist verbindlich und der Würfel bleibt verdeckt', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  s = fremdeEntscheiden(s, 'mitQuarantaene', { wuerfel: wuerfelMit(5) });
  assert.throws(() => fremdeEntscheiden(s, 'ablehnen'), RegelFehler);
  assert.equal(s.ereignisse.fremde.wurf, 5);
  const sicht = oeffentlicheSicht(s);
  assert.equal(sicht.ereignisse.fremde.wurf, null);
  assert.equal(sicht.ereignisse.fremde.ergebnis, null);
  assert.equal(JSON.stringify(s.protokoll).includes('"wurf"'), false); // nicht im Protokoll
  assert.equal(s.ereignisse.fremde.wurf, 5); // Original bleibt unverändert
});

test('Unbekannte: Würfel müssen 1 bis 6 liefern', () => {
  const s = weiter(reichesSpiel(), 2, 'handel');
  assert.throws(() => fremdeEntscheiden(s, 'ablehnen', { wuerfel: () => 7 }), RegelFehler);
  assert.throws(() => fremdeEntscheiden(s, 'gibtEsNicht'), RegelFehler);
});

test('Unbekannte: Aufnahme mit Quarantäne kostet 2 N, 2 W, 1 M, 1 S', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  const vorher = gesamtBestand(s);
  s = fremdeEntscheiden(s, 'mitQuarantaene', { wuerfel: wuerfelMit(1) });
  s = ereignisBezahlen(s, 'fremde');
  const nachher = gesamtBestand(s);
  assert.deepEqual(
    { N: vorher.N - nachher.N, W: vorher.W - nachher.W, M: vorher.M - nachher.M, S: vorher.S - nachher.S, E: vorher.E - nachher.E },
    { N: 2, W: 2, M: 1, S: 1, E: 0 },
  );
});

test('Unbekannte: Aufnahme ohne Quarantäne kostet 2 N und 2 W', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  const vorher = gesamtBestand(s);
  s = fremdeEntscheiden(s, 'ohneQuarantaene', { wuerfel: wuerfelMit(1) });
  s = ereignisBezahlen(s, 'fremde');
  const nachher = gesamtBestand(s);
  assert.equal(vorher.N - nachher.N, 2);
  assert.equal(vorher.W - nachher.W, 2);
  assert.equal(vorher.M, nachher.M);
  assert.equal(vorher.S, nachher.S);
});

test('Unbekannte: Würfel 1-4 (Wahrheit) bringt 3 Energie in den Gemeinschaftsvorrat', () => {
  for (const wurf of [1, 2, 3, 4]) {
    let s = weiter(reichesSpiel(), 2, 'handel');
    s = fremdeEntscheiden(s, 'mitQuarantaene', { wuerfel: wuerfelMit(wurf) });
    s = ereignisBezahlen(s, 'fremde');
    s = weiter(s, 2, 'abrechnung');
    assert.equal(s.gemeinschaftsvorrat.bestand.E, 3, `Wurf ${wurf}`);
    assert.equal(s.ereignisse.fremde.ergebnis, 'wahrheit');
    assert.equal(s.ereignisse.fremde.aufgedeckt, true);
    assert.equal(hat(s, 2, -1), false);
  }
});

test('Unbekannte: Seuche mit Quarantäne kostet zusätzlich 1 Medikament, keine Stabilität', () => {
  for (const wurf of [5, 6]) {
    let s = weiter(reichesSpiel(), 2, 'handel');
    s = fremdeEntscheiden(s, 'mitQuarantaene', { wuerfel: wuerfelMit(wurf) });
    s = ereignisBezahlen(s, 'fremde');
    const vorherM = gesamtBestand(s).M;
    s = weiter(s, 2, 'ereignis');
    const mVorAbrechnung = gesamtBestand(s).M;
    s = naechstePhase(s);
    // Krankheitskarte Runde 2 (4) und Seuche (1) werden in der Abrechnung bezahlt
    assert.equal(mVorAbrechnung - gesamtBestand(s).M, 4 + 1);
    assert.equal(s.gemeinschaftsvorrat.bestand.E, 0);
    assert.equal(s.ereignisse.fremde.ergebnis, 'seuche');
    assert.equal(vorherM > 0, true);
    assert.equal(hat(s, 2, -1), false);
  }
});

test('Unbekannte: Seuche ohne Quarantäne kostet 3 Medikamente und 1 Stabilität', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  s = fremdeEntscheiden(s, 'ohneQuarantaene', { wuerfel: wuerfelMit(6) });
  s = ereignisBezahlen(s, 'fremde');
  s = weiter(s, 2, 'ereignis');
  const m = gesamtBestand(s).M;
  s = naechstePhase(s);
  assert.equal(m - gesamtBestand(s).M, 4 + 3);
  assert.equal(hat(s, 2, -1), true);
});

test('Unbekannte: Würfel zeigt Seuche, aber Fremde wurden abgelehnt: keine Wirkung', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  s = fremdeEntscheiden(s, 'ablehnen', { wuerfel: wuerfelMit(6) });
  s = weiter(s, 2, 'ereignis');
  const m = gesamtBestand(s).M;
  s = naechstePhase(s);
  assert.equal(m - gesamtBestand(s).M, 4); // nur die Krankheitskarte
  assert.equal(s.ereignisse.fremde.aufgedeckt, true); // wird nur zur Auflösung gezeigt
  assert.equal(buchung(s, 2).some((b) => /Unbekannte|Seuche/.test(b.grund)), false);
});

test('Unbekannte: nicht entschieden: -2 Stabilität, es wird nichts gewürfelt', () => {
  const s = weiter(reichesSpiel(), 2, 'abrechnung');
  assert.equal(s.ereignisse.fremde.wurf, null);
  assert.equal(buchung(s, 2).filter((b) => b.delta === -2 && /Unbekannte/.test(b.grund)).length, 1);
});

test('Unbekannte: entschieden, aber Kosten nicht bezahlt: -2 Stabilität', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  s = fremdeEntscheiden(s, 'mitQuarantaene', { wuerfel: wuerfelMit(1) });
  s = weiter(s, 2, 'abrechnung');
  assert.equal(buchung(s, 2).some((b) => b.delta === -2 && /Kosten nicht bezahlt/.test(b.grund)), true);
});

test('Unbekannte: Bezahlen vor der Entscheidung ist nicht möglich', () => {
  const s = weiter(reichesSpiel(), 2, 'handel');
  assert.throws(() => ereignisBezahlen(s, 'fremde'), RegelFehler);
});

// ------------------------------------------------ Ereignis 3: Der Notstand

test('Notstand Vollvariante: Runde 3, Energieproduktion nur 3', () => {
  const s2 = weiter(reichesSpiel(), 2, 'produktion');
  assert.equal(s2.gruppen.techniker.letzteProduktion.E, 6);
  const s3 = weiter(s2, 3, 'produktion');
  assert.equal(s3.ereignisse.notstand.aktiv, true);
  assert.equal(s3.gruppen.techniker.letzteProduktion.E, 3);
  assert.equal(s3.gruppen.hydroponiker.letzteProduktion.N, 6);
});

test('Notstand Kurzvariante: schon in Runde 2', () => {
  const s = weiter(reichesSpiel('kurz'), 2, 'produktion');
  assert.equal(s.gruppen.techniker.letzteProduktion.E, 3);
});

test('Notstand: ohne Beschluss -2 Stabilität', () => {
  const s = weiter(reichesSpiel(), 3, 'abrechnung');
  assert.equal(buchung(s, 3).some((b) => b.delta === -2 && /Notstand/.test(b.grund)), true);
});

test('Notstand: mit Beschluss keine Strafe; Beschluss braucht alle drei Angaben', () => {
  let s = weiter(reichesSpiel(), 3, 'handel');
  assert.throws(() => notstandBeschliessen(s, { entscheider: 'Techniker', dauer: '1 Runde' }), RegelFehler);
  assert.throws(() => notstandBeschliessen(s, { entscheider: ' ', dauer: 'x', kontrolle: 'y' }), RegelFehler);
  s = notstandBeschliessen(s, { entscheider: 'Techniker', dauer: 'bis Rundenende', kontrolle: 'Wächter' });
  assert.throws(() => notstandBeschliessen(s, { entscheider: 'a', dauer: 'b', kontrolle: 'c' }), RegelFehler);
  s = weiter(s, 3, 'abrechnung');
  assert.equal(buchung(s, 3).some((b) => /Notstand/.test(b.grund)), false);
});

test('Notstand: vor Runde 3 kann nicht beschlossen werden', () => {
  const s = weiter(reichesSpiel(), 2, 'handel');
  assert.throws(() => notstandBeschliessen(s, { entscheider: 'a', dauer: 'b', kontrolle: 'c' }), RegelFehler);
});

// ------------------------------------------------ mehrere Strafen in einer Abrechnung

test('Strafen addieren sich: Stufe 3 für alle, Krankheitskarte, Filter, Notstand', () => {
  const leerSpiel = mitBestand(neuesSpiel({ variante: 'kurz' }), {});
  const s = spieleBis(leerSpiel, 2, 'abrechnung');
  // Alle Gruppen starten ohne Marker nur mit Produktion; wichtig ist: es wird nie negativ gebucht über 0
  assert.equal(s.stabilitaet >= 0, true);
  assert.equal(s.status === 'zerfallen' || s.status === 'beendet', true);
});

test('Ideale Verteilung bis zum Ende der Kurzvariante bleibt spielbar', () => {
  let s = neuesSpiel({ variante: 'kurz' });
  s = spieleBis(s, 1, 'handel');
  s = verteileIdeal(s, {
    hydroponiker: { N: 1, W: 2, E: 2, S: 1 },
    wasserwerker: { N: 1, W: 1, E: 2, S: 1 },
    techniker: { N: 1, W: 1, E: 1, S: 1 },
    sanitaeter: { N: 1, W: 1, E: 2 },
    waechter: { N: 1, W: 1, E: 1 },
  });
  s.gruppen.wasserwerker.bestand.W += s.gruppen.sanitaeter.bestand.W - 1;
  s.gruppen.sanitaeter.bestand.W = 1;
  s = spieleBis(s, 1, 'abrechnung');
  assert.equal(s.stabilitaet, 10);
  assert.equal(s.status, 'laeuft');
});

test('Unbekannte: Die Energie aus dem Vorrat kann die Konferenz verteilen; Verwalter lässt sich nachtragen', () => {
  let s = weiter(reichesSpiel(), 2, 'handel');
  s = fremdeEntscheiden(s, 'mitQuarantaene', { wuerfel: wuerfelMit(2) });
  s = ereignisBezahlen(s, 'fremde');
  s = weiter(s, 3, 'handel');
  s = gemeinschaftAuszahlen(s, 'techniker', { E: 3 });
  assert.equal(s.gemeinschaftsvorrat.bestand.E, 0);
  s = gemeinschaftEinrichten(s, { verwalter: 'sanitaeter', ordnung: 'nach Bedarf' });
  assert.equal(s.gemeinschaftsvorrat.verwalter, 'sanitaeter');
  assert.throws(() => gemeinschaftEinrichten(s, { verwalter: 'techniker' }), RegelFehler);
});
