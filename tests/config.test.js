import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/regeln/index.js';
import { summe, marker, MARKER_ARTEN } from '../src/regeln/marker.js';

test('Betriebskosten aller Gruppen ergeben N5 W6 E8 S3 (22 Marker)', () => {
  let gesamt = marker();
  for (const g of Object.values(CONFIG.gruppen)) {
    for (const a of MARKER_ARTEN) gesamt[a] += g.betriebskosten[a] ?? 0;
  }
  assert.deepEqual(gesamt, { N: 5, W: 6, E: 8, M: 0, S: 3 });
  assert.equal(summe(gesamt), 22);
});

test('Jede Gruppe startet nur mit ihrem eigenen Gut', () => {
  for (const g of Object.values(CONFIG.gruppen)) {
    assert.deepEqual(Object.keys(g.start), [g.gut]);
  }
});

test('Startvorräte und Produktion laut Tabelle', () => {
  const g = CONFIG.gruppen;
  assert.deepEqual(
    Object.values(g).map((x) => [x.start[x.gut], x.produktion]),
    [[6, 6], [6, 6], [5, 6], [4, 3], [5, 3]],
  );
});

test('Varianten: Runden, Krankheitskarten, Ereignisse, Vertragsartikel', () => {
  const { voll, kurz } = CONFIG.varianten;
  assert.equal(voll.runden, 3);
  assert.equal(voll.spielzeitStundenProRunde, 16);
  assert.deepEqual(voll.krankheitskarten, [3, 4, 5]);
  assert.deepEqual(voll.ereignisse, { letzterFilter: 1, fremde: 2, notstand: 3 });
  assert.equal(voll.vertragsartikel.length, 7);
  assert.equal(kurz.runden, 2);
  assert.equal(kurz.spielzeitStundenProRunde, 24);
  assert.deepEqual(kurz.krankheitskarten, [3, 5]);
  assert.deepEqual(kurz.ereignisse, { letzterFilter: 1, notstand: 2 });
  assert.equal(kurz.vertragsartikel.length, 4);
  assert.equal(voll.notstandFristMinuten, 5);
  assert.equal(kurz.notstandFristMinuten, 3);
});

test('Die Konfiguration ist schreibgeschützt', () => {
  assert.throws(() => {
    'use strict';
    CONFIG.stabilitaet.start = 99;
  });
});
