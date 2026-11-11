// Referenzwerte aus der Spielbeschreibung ("bei idealer Verteilung").
import test from 'node:test';
import assert from 'node:assert/strict';
import { idealeBilanz } from '../src/regeln/index.js';

const rest = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== 0));

test('Runde 1 (beide Varianten): Überschuss N7 W6 E3 M4 S5', () => {
  for (const variante of ['voll', 'kurz']) {
    const [r1] = idealeBilanz(variante);
    assert.deepEqual(rest(r1.ueberschuss), { N: 7, W: 6, E: 3, M: 4, S: 5 });
    assert.deepEqual(rest(r1.fehlt), {});
  }
});

test('Vollvariante Runde 2 (Reparatur + Aufnahme mit Quarantäne): W fehlt 1, E fehlt 1', () => {
  const [, r2] = idealeBilanz('voll', { fremde: 'seuche', quarantaene: true });
  assert.equal(r2.fehlt.W, 1);
  assert.equal(r2.fehlt.E, 1);
});

test('Vollvariante Runde 2: sagen die Fremden die Wahrheit, kommen 3 Energie dazu', () => {
  const [, r2] = idealeBilanz('voll', { fremde: 'wahrheit', quarantaene: true });
  assert.equal(r2.fehlt.W, 1);
  assert.equal(r2.fehlt.E, 0);
  assert.equal(r2.ueberschuss.E, 2); // -1 + 3
});

test('Vollvariante Runde 3 (Notstand): E fehlt 3, M Rest 0', () => {
  // Die Referenz geht von der Wahrheit-Variante aus (E-Übertrag 2); siehe docs/offene-fragen.md
  const [, , r3] = idealeBilanz('voll', { fremde: 'wahrheit', quarantaene: true });
  assert.equal(r3.fehlt.E, 3);
  assert.equal(r3.ueberschuss.M, 0);
  assert.equal(r3.fehlt.M, 0);
});

test('Kurzvariante Runde 2 (Notstand + Reparatur): E fehlt 4, M Rest 2', () => {
  const [, r2] = idealeBilanz('kurz');
  assert.equal(r2.fehlt.E, 4);
  assert.equal(r2.ueberschuss.M, 2);
});

test('Ohne Aufnahme der Fremden entfallen deren Kosten', () => {
  const [, r2] = idealeBilanz('voll', { fremde: 'ablehnen' });
  assert.equal(r2.fehlt.W, 0); // 4 + 3 - 6 = 1 Überschuss
  assert.equal(r2.ueberschuss.W, 1);
});
