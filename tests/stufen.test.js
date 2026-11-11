import test from 'node:test';
import assert from 'node:assert/strict';
import { berechneStufe, produktionsMenge } from '../src/regeln/index.js';

test('Stufe 1, wenn nichts unbezahlt ist', () => {
  for (const id of ['hydroponiker', 'wasserwerker', 'techniker', 'sanitaeter', 'waechter']) {
    assert.equal(berechneStufe(id, 0), 1);
  }
});

test('Stufe 2 bis zur Hälfte unbezahlt, darüber Stufe 3 (Hydroponiker: 6 Kosten)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((u) => berechneStufe('hydroponiker', u)), [2, 2, 2, 3, 3, 3]);
});

test('Sanitäter (4 Kosten): 2 unbezahlt = Hälfte = Stufe 2, 3 = Stufe 3', () => {
  assert.deepEqual([1, 2, 3, 4].map((u) => berechneStufe('sanitaeter', u)), [2, 2, 3, 3]);
});

test('Wächter (3 Kosten): 1 unbezahlt ist Stufe 2, 2 ist schon mehr als die Hälfte', () => {
  assert.deepEqual([1, 2, 3].map((u) => berechneStufe('waechter', u)), [2, 3, 3]);
});

test('Produktion: Stufe 1 voll, Stufe 2 halbiert und aufgerundet, Stufe 3 null', () => {
  assert.equal(produktionsMenge('hydroponiker', { stufe: 1 }), 6);
  assert.equal(produktionsMenge('hydroponiker', { stufe: 2 }), 3);
  assert.equal(produktionsMenge('sanitaeter', { stufe: 1 }), 3);
  assert.equal(produktionsMenge('sanitaeter', { stufe: 2 }), 2); // 1,5 aufgerundet
  assert.equal(produktionsMenge('waechter', { stufe: 2 }), 2);
  assert.equal(produktionsMenge('hydroponiker', { stufe: 3 }), 0);
});

test('Defekter Filter senkt nur die Wasserproduktion auf 3', () => {
  assert.equal(produktionsMenge('wasserwerker', { filterDefekt: true }), 3);
  assert.equal(produktionsMenge('hydroponiker', { filterDefekt: true }), 6);
});

test('Defekter Filter und Stufe 2 zusammen: 3 halbiert ergibt 2', () => {
  assert.equal(produktionsMenge('wasserwerker', { filterDefekt: true, stufe: 2 }), 2);
});

test('Notstand senkt nur die Energieproduktion auf 3', () => {
  assert.equal(produktionsMenge('techniker', { notstand: true }), 3);
  assert.equal(produktionsMenge('wasserwerker', { notstand: true }), 6);
});
