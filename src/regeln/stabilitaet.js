// Stabilität der Station: Bewertung und Verbuchung.
import { CONFIG } from './config.js';

/** Begrenzt einen Wert auf 0..Maximum. */
export function begrenze(wert) {
  return Math.max(0, Math.min(CONFIG.stabilitaet.max, wert));
}

/** Textliche Bewertung: stabil, angespannt, kritisch oder Zerfall. */
export function bewertung(wert) {
  const stufe = CONFIG.stabilitaet.bewertung.find((b) => wert >= b.von && wert <= b.bis);
  return stufe ? stufe.name : 'unbekannt';
}

/**
 * Wendet eine Liste von Buchungen ({ grund, delta }) auf einen Stand an.
 * Die Änderungen einer Runde werden erst addiert und dann auf 0..Maximum begrenzt.
 */
export function verbuche(stand, buchungen) {
  return begrenze(stand + buchungen.reduce((s, b) => s + b.delta, 0));
}
