// Rechnen mit Marker-Objekten, z. B. { N: 1, W: 2 }.
import { CONFIG } from './config.js';
import { RegelFehler } from './fehler.js';

export const MARKER_ARTEN = Object.keys(CONFIG.marker);

/** Marker-Objekt mit allen Arten auf 0. */
export function leer() {
  return Object.fromEntries(MARKER_ARTEN.map((art) => [art, 0]));
}

/** Prüft und normalisiert ein Marker-Objekt (nur bekannte Arten, ganze Zahlen >= 0). */
export function marker(teil = {}) {
  const ergebnis = leer();
  for (const [art, anzahl] of Object.entries(teil)) {
    if (!MARKER_ARTEN.includes(art)) throw new RegelFehler(`Unbekannte Markerart: ${art}`);
    if (!Number.isInteger(anzahl) || anzahl < 0) {
      throw new RegelFehler(`Ungültige Anzahl für ${art}: ${anzahl}`);
    }
    ergebnis[art] = anzahl;
  }
  return ergebnis;
}

function verknuepfe(a, b, f) {
  return Object.fromEntries(MARKER_ARTEN.map((art) => [art, f(a[art] ?? 0, b[art] ?? 0)]));
}

export const addiere = (a, b) => verknuepfe(a, b, (x, y) => x + y);
/** Kann negative Werte ergeben (Fehlbetrag). */
export const subtrahiere = (a, b) => verknuepfe(a, b, (x, y) => x - y);
export const kleinere = (a, b) => verknuepfe(a, b, Math.min);
/** Nur der positive Teil (Überschuss). */
export const positiv = (m) => verknuepfe(m, {}, (x) => Math.max(0, x));
/** Nur der Fehlbetrag als positive Zahlen. */
export const fehlbetrag = (m) => verknuepfe(m, {}, (x) => Math.max(0, -x));

export const summe = (m) => MARKER_ARTEN.reduce((s, art) => s + (m[art] ?? 0), 0);
export const istLeer = (m) => summe(m) === 0;
/** true, wenn der Bestand den Bedarf in jeder Art deckt. */
export const reicht = (bestand, bedarf) =>
  MARKER_ARTEN.every((art) => (bestand[art] ?? 0) >= (bedarf[art] ?? 0));

/** Lesbare Kurzform, z. B. "N2 W1" (leer: "–"). */
export function text(m) {
  const teile = MARKER_ARTEN.filter((art) => (m[art] ?? 0) !== 0).map((art) => `${art}${m[art]}`);
  return teile.length ? teile.join(' ') : '–';
}
