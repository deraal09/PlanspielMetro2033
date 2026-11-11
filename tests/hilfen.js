// Gemeinsame Hilfen für die Tests (keine Testdatei).
import { neuesSpiel, naechstePhase } from '../src/regeln/index.js';
import { marker } from '../src/regeln/marker.js';

export const IDS = ['hydroponiker', 'wasserwerker', 'techniker', 'sanitaeter', 'waechter'];

/** Geht bis zur gewünschten Phase der gewünschten Runde. */
export function spieleBis(zustand, runde, phase) {
  let s = zustand;
  let schutz = 0;
  while (!(s.runde === runde && s.phase === phase)) {
    s = naechstePhase(s);
    if (++schutz > 100) throw new Error('Phase nicht erreicht');
  }
  return s;
}

/** Setzt die Bestände einzelner Gruppen direkt (nur für Tests). */
export function mitBestand(zustand, bestaende) {
  const s = structuredClone(zustand);
  for (const [id, m] of Object.entries(bestaende)) s.gruppen[id].bestand = marker(m);
  return s;
}

/**
 * Verteilt die Bestände so, dass jede Gruppe ihre Betriebskosten genau decken kann;
 * der Rest geht an die Sanitäter. Entspricht der "idealen Verteilung".
 */
export function verteileIdeal(zustand, kosten) {
  const s = structuredClone(zustand);
  const topf = { N: 0, W: 0, E: 0, M: 0, S: 0 };
  for (const id of IDS) for (const a of Object.keys(topf)) topf[a] += s.gruppen[id].bestand[a];
  for (const id of IDS) {
    s.gruppen[id].bestand = marker(kosten[id]);
    for (const a of Object.keys(topf)) topf[a] -= kosten[id][a] ?? 0;
  }
  for (const a of Object.keys(topf)) {
    if (topf[a] < 0) throw new Error(`Nicht genug ${a} für ideale Verteilung`);
    s.gruppen.sanitaeter.bestand[a] += topf[a];
  }
  return s;
}

export function wuerfelMit(...werte) {
  let i = 0;
  return () => werte[i++ % werte.length];
}
