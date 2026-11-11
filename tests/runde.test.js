import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RegelFehler,
  auswertung,
  gesamtBestand,
  krankheitskarteBezahlen,
  naechstePhase,
  neuesSpiel,
  tausche,
  zwangsmassnahme,
  gemeinschaftEinrichten,
  gemeinschaftEinzahlen,
  gemeinschaftAuszahlen,
  geheimkarteWerten,
} from '../src/regeln/index.js';
import { summe } from '../src/regeln/marker.js';
import { mitBestand, spieleBis, verteileIdeal } from './hilfen.js';

const KOSTEN = {
  hydroponiker: { N: 1, W: 2, E: 2, S: 1 },
  wasserwerker: { N: 1, W: 1, E: 2, S: 1 },
  techniker: { N: 1, W: 1, E: 1, S: 1 },
  sanitaeter: { N: 1, W: 1, E: 2 },
  waechter: { N: 1, W: 1, E: 1 },
};

test('Neues Spiel: Startvorräte, Stabilität 10, Phase start', () => {
  const s = neuesSpiel({ variante: 'voll' });
  assert.equal(s.phase, 'start');
  assert.equal(s.stabilitaet, 10);
  assert.deepEqual(s.gruppen.techniker.bestand, { N: 0, W: 0, E: 5, M: 0, S: 0 });
  assert.throws(() => neuesSpiel({ variante: 'xyz' }), RegelFehler);
});

test('Runde 1: Produktion kommt zum Startvorrat dazu', () => {
  const s = spieleBis(neuesSpiel(), 1, 'produktion');
  assert.equal(s.gruppen.hydroponiker.bestand.N, 12);
  assert.equal(s.gruppen.techniker.bestand.E, 11);
  assert.equal(s.gruppen.sanitaeter.bestand.M, 7);
  assert.equal(s.gruppen.waechter.bestand.S, 8);
});

test('Der Zustand ist unveränderlich: Aktionen liefern einen neuen Zustand', () => {
  const s = neuesSpiel();
  const t = naechstePhase(s);
  assert.equal(s.phase, 'start');
  assert.equal(t.phase, 'produktion');
});

test('Politikphase gibt es erst ab Runde 2', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  assert.equal(naechstePhase(s).phase, 'betriebskosten');
  s = spieleBis(s, 2, 'handel');
  assert.equal(naechstePhase(s).phase, 'politik');
});

test('Ohne Handel zahlt jede Gruppe nur ihr eigenes Gut: alle Stufe 3, Stabilität 5', () => {
  const s = spieleBis(neuesSpiel(), 1, 'abrechnung');
  for (const id of Object.keys(KOSTEN)) assert.equal(s.gruppen[id].stufe, 3, id);
  assert.equal(s.stabilitaet, 5); // 10 - 5 Gruppen in Stufe 3
  assert.equal(s.abrechnungen[0].bewertung, 'angespannt');
});

test('Stufe 3 bedeutet: keine Produktion in der nächsten Runde', () => {
  const s = spieleBis(neuesSpiel(), 2, 'produktion');
  for (const id of Object.keys(KOSTEN)) {
    assert.equal(s.gruppen[id].stufe, 3, id);
    assert.equal(summe(s.gruppen[id].letzteProduktion), 0, id);
  }
});

test('Ideale Verteilung in Runde 1: alle Stufe 1, Stabilität bleibt bei 10 (Maximum)', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  // Das überschüssige Wasser liegt bei den Wasserwerkern; nur dort schlägt der Filterausfall zu
  const ueberschussW = s.gruppen.sanitaeter.bestand.W - KOSTEN.sanitaeter.W;
  s.gruppen.wasserwerker.bestand.W += ueberschussW;
  s.gruppen.sanitaeter.bestand.W -= ueberschussW;
  s = spieleBis(s, 1, 'abrechnung');
  for (const id of Object.keys(KOSTEN)) assert.equal(s.gruppen[id].stufe, 1, id);
  assert.equal(s.stabilitaet, 10);
  assert.deepEqual(s.abrechnungen[0].buchungen, [{ grund: 'Alle Gruppen in Stufe 1', delta: 1 }]);
  // Überschuss N7 W6 E3 M4 S5, davon verliert der Filter 2 Wasser
  assert.deepEqual(gesamtBestand(s), { N: 7, W: 4, E: 3, M: 4, S: 5 });
});

test('Nach Stufe 2 wird die Produktion der nächsten Runde halbiert (aufgerundet)', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  // Wächter bekommt 1 Nahrung weniger -> 1 von 3 unbezahlt = Stufe 2
  s.gruppen.waechter.bestand.N = 0;
  s.gruppen.sanitaeter.bestand.N += 1;
  s = spieleBis(s, 2, 'produktion');
  assert.equal(s.gruppen.waechter.stufe, 2);
  assert.equal(s.gruppen.waechter.letzteProduktion.S, 2); // 3 -> 1,5 -> 2
  assert.equal(s.gruppen.hydroponiker.letzteProduktion.N, 6);
});

test('Stabilität: -1 je Gruppe in Stufe 3, kein Bonus', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  // Wächter zahlt nichts: 3 von 3 unbezahlt = Stufe 3
  s.gruppen.waechter.bestand = { N: 0, W: 0, E: 0, M: 0, S: 0 };
  s.gruppen.sanitaeter.bestand.N += 1;
  s.gruppen.sanitaeter.bestand.W += 1;
  s.gruppen.sanitaeter.bestand.E += 1;
  s = spieleBis(s, 1, 'abrechnung');
  assert.equal(s.gruppen.waechter.stufe, 3);
  assert.equal(s.stabilitaet, 9);
});

test('Krankheitskarte nicht bezahlbar: -1 Stabilität', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  s.gruppen.sanitaeter.bestand.M = 2; // Karte kostet 3
  s = spieleBis(s, 1, 'abrechnung');
  assert.equal(s.krankheitskarte.vollstaendig, false);
  // Die Änderungen einer Runde werden addiert und dann begrenzt: +1 und -1 ergeben 0
  assert.deepEqual(s.abrechnungen[0].buchungen.map((b) => b.delta), [1, -1]);
  assert.equal(s.stabilitaet, 10);
});

test('Krankheitskarte: Bezahlung aus beliebigen Beständen, auch verteilt', () => {
  let s = spieleBis(neuesSpiel(), 1, 'ereignis');
  const vorher = gesamtBestand(s).M;
  s = krankheitskarteBezahlen(s, { sanitaeter: 2, hydroponiker: 0 });
  assert.equal(s.krankheitskarte.bezahlt, 2);
  s = krankheitskarteBezahlen(s);
  assert.equal(s.krankheitskarte.vollstaendig, true);
  assert.equal(gesamtBestand(s).M, vorher - 3);
  assert.throws(() => krankheitskarteBezahlen(s), RegelFehler);
});

test('Ein Beschluss ersetzt keine Marker: Zahlung ohne Bestand schlägt fehl', () => {
  const s = spieleBis(neuesSpiel(), 1, 'ereignis');
  assert.throws(() => krankheitskarteBezahlen(s, { hydroponiker: 1 }), RegelFehler);
});

test('Tausch: gegenseitig, Geschenk, zu wenig Marker, Phase', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = tausche(s, { a: 'hydroponiker', b: 'wasserwerker', gibtA: { N: 2 }, gibtB: { W: 1 } });
  assert.equal(s.gruppen.hydroponiker.bestand.N, 10);
  assert.equal(s.gruppen.hydroponiker.bestand.W, 1);
  assert.equal(s.gruppen.wasserwerker.bestand.N, 2);
  s = tausche(s, { a: 'techniker', b: 'waechter', gibtA: { E: 1 } }); // Geschenk
  assert.equal(s.gruppen.waechter.bestand.E, 1);
  assert.throws(() => tausche(s, { a: 'techniker', b: 'waechter', gibtA: { E: 99 } }), RegelFehler);
  assert.throws(() => tausche(s, { a: 'techniker', b: 'techniker', gibtA: { E: 1 } }), RegelFehler);
  assert.throws(() => tausche(s, { a: 'techniker', b: 'waechter' }), RegelFehler);
  const inProduktion = spieleBis(neuesSpiel(), 1, 'produktion');
  assert.throws(() => tausche(inProduktion, { a: 'techniker', b: 'waechter', gibtA: { E: 1 } }), RegelFehler);
});

test('Tausch erhält die Gesamtmenge', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  const vorher = gesamtBestand(s);
  s = tausche(s, { a: 'hydroponiker', b: 'sanitaeter', gibtA: { N: 3 }, gibtB: { M: 2 } });
  assert.deepEqual(gesamtBestand(s), vorher);
});

test('Gemeinschaftsvorrat: einrichten, einzahlen, auszahlen, nicht überziehen', () => {
  let s = spieleBis(neuesSpiel(), 2, 'politik');
  assert.throws(() => gemeinschaftEinzahlen(s, 'techniker', { E: 1 }), RegelFehler);
  s = gemeinschaftEinrichten(s, { verwalter: 'sanitaeter', ordnung: 'nach Bedarf' });
  s = gemeinschaftEinzahlen(s, 'techniker', { E: 2 });
  assert.equal(s.gemeinschaftsvorrat.bestand.E, 2);
  s = gemeinschaftAuszahlen(s, 'waechter', { E: 1 });
  assert.equal(s.gemeinschaftsvorrat.bestand.E, 1);
  assert.throws(() => gemeinschaftAuszahlen(s, 'waechter', { E: 5 }), RegelFehler);
  assert.throws(() => gemeinschaftEinrichten(s, { verwalter: 'techniker' }), RegelFehler);
});

test('Zwangsmaßnahme mit Beschluss: Marker wechseln, keine Stabilitätsstrafe', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  s = zwangsmassnahme(s, { ziel: 'sanitaeter', menge: { M: 2 }, konferenzbeschluss: true });
  assert.equal(s.gruppen.waechter.bestand.M, 2);
  s.gruppen.sanitaeter.bestand = { ...s.gruppen.sanitaeter.bestand, M: 5 };
  s = spieleBis(s, 1, 'abrechnung');
  assert.equal(s.abrechnungen[0].buchungen.some((b) => b.delta === -2), false);
});

test('Zwangsmaßnahme ohne Beschluss: -2 Stabilität in der Abrechnung', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  s.gruppen.sanitaeter.bestand.M = 8; // genug für Karte und Einzug
  s = zwangsmassnahme(s, { ziel: 'sanitaeter', menge: { M: 1 }, konferenzbeschluss: false });
  s = spieleBis(s, 1, 'abrechnung');
  assert.deepEqual(s.abrechnungen[0].buchungen.map((b) => b.delta), [1, -2]);
  assert.equal(s.stabilitaet, 9); // +1 und -2 ergeben -1
});

test('Zwangsmaßnahme: nur einmal, höchstens 2 Marker, nur mit vorhandenen Markern', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  assert.throws(() => zwangsmassnahme(s, { ziel: 'techniker', menge: { E: 3 }, konferenzbeschluss: true }), RegelFehler);
  assert.throws(() => zwangsmassnahme(s, { ziel: 'techniker', menge: { M: 1 }, konferenzbeschluss: true }), RegelFehler);
  assert.throws(() => zwangsmassnahme(s, { ziel: 'waechter', menge: { S: 1 }, konferenzbeschluss: true }), RegelFehler);
  s = zwangsmassnahme(s, { ziel: 'techniker', menge: { E: 2 }, konferenzbeschluss: true });
  assert.throws(() => zwangsmassnahme(s, { ziel: 'techniker', menge: { E: 1 }, konferenzbeschluss: true }), RegelFehler);
});

test('Stabilität bis 0: Station zerfällt, alle verlieren', () => {
  let s = neuesSpiel({ variante: 'voll' });
  s = mitBestand(s, { hydroponiker: {}, wasserwerker: {}, techniker: {}, sanitaeter: {}, waechter: {} });
  s.stabilitaet = 3;
  s = spieleBis(s, 1, 'abrechnung');
  assert.equal(s.status, 'zerfallen');
  assert.equal(s.stabilitaet, 0);
  assert.throws(() => naechstePhase(s), RegelFehler);
  assert.equal(auswertung(s).zerfall, true);
  assert.equal(auswertung(s).bewertung, 'Zerfall');
});

test('Stabilität steigt höchstens bis 10', () => {
  let s = spieleBis(neuesSpiel(), 1, 'handel');
  s = verteileIdeal(s, KOSTEN);
  s.stabilitaet = 9;
  s = spieleBis(s, 1, 'abrechnung');
  assert.equal(s.stabilitaet, 10);
});

test('Spielende nach der letzten Runde; Geheimkarten zählen nur bei Stabilität >= 1', () => {
  let s = spieleBis(neuesSpiel({ variante: 'kurz' }), 2, 'abrechnung');
  assert.equal(s.status === 'beendet' || s.status === 'zerfallen', true);
  assert.throws(() => geheimkarteWerten(neuesSpiel(), 'techniker', true), RegelFehler);
  s = geheimkarteWerten(s, 'techniker', true);
  s = geheimkarteWerten(s, 'waechter', false);
  const a = auswertung(s);
  assert.equal(a.gruppenpunkte.techniker, s.stabilitaet >= 1 ? 3 : 0);
  assert.equal(a.gruppenpunkte.waechter, 0);
});

test('Geheimkarte bringt bei Zerfall keine Punkte', () => {
  let s = neuesSpiel();
  s.stabilitaet = 0;
  s.status = 'zerfallen';
  s = geheimkarteWerten(s, 'techniker', true);
  assert.equal(auswertung(s).gruppenpunkte.techniker, 0);
});
