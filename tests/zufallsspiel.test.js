// Zufallsspiele: Wie auch immer gespielt wird, der Zustand bleibt gültig.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RegelFehler,
  CONFIG,
  naechstePhase,
  neuesSpiel,
  tausche,
  ereignisBezahlen,
  fremdeEntscheiden,
  notstandBeschliessen,
  krankheitskarteBezahlen,
  zwangsmassnahme,
  gemeinschaftEinrichten,
  gemeinschaftEinzahlen,
} from '../src/regeln/index.js';
import { IDS } from './hilfen.js';
import { MARKER_ARTEN } from '../src/regeln/marker.js';

// einfacher, wiederholbarer Zufallsgenerator
function zufall(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

function pruefeZustand(s) {
  assert.ok(s.stabilitaet >= 0 && s.stabilitaet <= CONFIG.stabilitaet.max, 'Stabilität im Bereich');
  for (const id of IDS) {
    for (const art of MARKER_ARTEN) {
      assert.ok(Number.isInteger(s.gruppen[id].bestand[art]) && s.gruppen[id].bestand[art] >= 0, `${id} ${art}`);
    }
  }
  for (const art of MARKER_ARTEN) assert.ok(s.gemeinschaftsvorrat.bestand[art] >= 0);
}

function zufaelligeAktion(s, r) {
  const wahl = (liste) => liste[Math.floor(r() * liste.length)];
  const art = wahl(MARKER_ARTEN);
  const aktionen = [
    () => tausche(s, { a: wahl(IDS), b: wahl(IDS), gibtA: { [art]: 1 + Math.floor(r() * 3) }, gibtB: r() < 0.5 ? { [wahl(MARKER_ARTEN)]: 1 } : {} }),
    () => ereignisBezahlen(s, wahl(['letzterFilter', 'fremde'])),
    () => fremdeEntscheiden(s, wahl(['ablehnen', 'mitQuarantaene', 'ohneQuarantaene'])),
    () => notstandBeschliessen(s, { entscheider: 'x', dauer: 'y', kontrolle: 'z' }),
    () => krankheitskarteBezahlen(s),
    () => zwangsmassnahme(s, { ziel: wahl(IDS), menge: { [art]: 1 }, konferenzbeschluss: r() < 0.5 }),
    () => gemeinschaftEinrichten(s, { verwalter: wahl(IDS) }),
    () => gemeinschaftEinzahlen(s, wahl(IDS), { [art]: 1 }),
  ];
  return wahl(aktionen)();
}

test('200 Zufallsspiele beider Varianten enden ohne ungültigen Zustand', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = zufall(seed);
    let s = neuesSpiel({ variante: seed % 2 ? 'voll' : 'kurz' });
    let schritte = 0;
    while (s.status === 'laeuft') {
      for (let i = 0; i < 6; i++) {
        try {
          s = zufaelligeAktion(s, r);
        } catch (e) {
          if (!(e instanceof RegelFehler)) throw e; // regelwidrig ist ok, Abstürze nicht
        }
        pruefeZustand(s);
      }
      s = naechstePhase(s);
      pruefeZustand(s);
      assert.ok(++schritte < 60, 'Spiel endet');
    }
    assert.ok(['beendet', 'zerfallen'].includes(s.status));
    assert.equal(s.abrechnungen.length >= 1, true);
  }
});

test('Der Zustand lässt sich als JSON speichern und weiterspielen', () => {
  let s = neuesSpiel();
  s = naechstePhase(s);
  s = naechstePhase(JSON.parse(JSON.stringify(s)));
  assert.equal(s.phase, 'handel');
});
