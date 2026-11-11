// Stufen nach den Betriebskosten und die daraus folgende Produktion.
import { CONFIG } from './config.js';
import { summe } from './marker.js';

/**
 * Stufe einer Gruppe aus der Zahl unbezahlter Betriebskosten-Marker.
 * Stufe 1: nichts unbezahlt. Stufe 2: höchstens die Hälfte unbezahlt.
 * Stufe 3: mehr als die Hälfte unbezahlt.
 */
export function berechneStufe(gruppeId, unbezahlt) {
  if (unbezahlt <= 0) return 1;
  const gesamt = summe(CONFIG.gruppen[gruppeId].betriebskosten);
  return unbezahlt <= gesamt * CONFIG.stufen.stufe2MaxUnbezahltAnteil ? 2 : 3;
}

/**
 * Produktion einer Gruppe in einer Runde.
 * - filterDefekt: "Der letzte Filter" ist ausgefallen und nicht repariert
 * - notstand: Ereignis "Der Notstand" gilt in dieser Runde
 * - stufe: Stufe aus der Vorrunde (2 halbiert aufgerundet, 3 ergibt 0)
 */
export function produktionsMenge(gruppeId, { stufe = 1, filterDefekt = false, notstand = false } = {}) {
  const gruppe = CONFIG.gruppen[gruppeId];
  let menge = gruppe.produktion;
  const filter = CONFIG.ereignisse.letzterFilter;
  const not = CONFIG.ereignisse.notstand;
  if (filterDefekt && gruppeId === filter.gruppe) menge = Math.min(menge, filter.produktionDefekt);
  if (notstand && gruppe.gut === not.gut) menge = Math.min(menge, not.produktion);
  return Math.ceil(menge * CONFIG.stufen.produktionsfaktor[stufe]);
}
