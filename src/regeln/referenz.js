// Referenzrechnung "ideale Verteilung": Alle Marker aller Gruppen werden wie in
// einem gemeinsamen Topf betrachtet, jede Gruppe kann also genau das bezahlen,
// was sie braucht. So lässt sich prüfen, ob die Zahlen des Spiels aufgehen.
//
// Annahmen (siehe docs/offene-fragen.md):
// - Ein Fehlbetrag wird nicht in die nächste Runde mitgenommen (Bestand >= 0).
// - Die Reparatur beim "letzten Filter" wird in der Runde nach dem Ausfall
//   bezahlt, nach der Produktion. Dadurch ist die Wasserproduktion in dieser
//   Runde noch gedrosselt.
// - "Der letzte Filter" kostet 2 Wasser erst nach der Rundenbilanz.
import { CONFIG } from './config.js';
import {
  addiere,
  fehlbetrag,
  kleinere,
  leer,
  marker,
  positiv,
  subtrahiere,
} from './marker.js';
import { produktionsMenge } from './stufen.js';

const GRUPPEN_IDS = Object.keys(CONFIG.gruppen);

/**
 * @param {'voll'|'kurz'} variante
 * @param {{ fremde?: 'wahrheit'|'seuche'|'ablehnen', quarantaene?: boolean }} optionen
 *   Nur für die Vollvariante: Entscheidung bei den Unbekannten und was die Würfel zeigen.
 * @returns Liste je Runde mit saldo (kann negativ sein), ueberschuss, fehlt, uebertrag.
 */
export function idealeBilanz(variante, { fremde = 'wahrheit', quarantaene = true } = {}) {
  const v = CONFIG.varianten[variante];
  let topf = leer();
  for (const id of GRUPPEN_IDS) topf = addiere(topf, marker(CONFIG.gruppen[id].start));

  let filterAusgefallen = false;
  let reparaturOffen = false;
  const runden = [];

  for (let runde = 1; runde <= v.runden; runde++) {
    const notstand = v.ereignisse.notstand === runde;
    let produktion = leer();
    let kosten = leer();
    for (const id of GRUPPEN_IDS) {
      const gut = CONFIG.gruppen[id].gut;
      produktion = addiere(
        produktion,
        marker({ [gut]: produktionsMenge(id, { filterDefekt: filterAusgefallen, notstand }) }),
      );
      kosten = addiere(kosten, marker(CONFIG.gruppen[id].betriebskosten));
    }
    kosten = addiere(kosten, marker({ M: v.krankheitskarten[runde - 1] }));

    if (reparaturOffen) {
      kosten = addiere(kosten, marker(CONFIG.ereignisse.letzterFilter.reparatur));
      reparaturOffen = false;
      filterAusgefallen = false; // ab der nächsten Runde volle Produktion
    }

    let gewinn = leer();
    if (v.ereignisse.fremde === runde && fremde !== 'ablehnen') {
      const cfg = CONFIG.ereignisse.fremde;
      const option = cfg.optionen[quarantaene ? 'mitQuarantaene' : 'ohneQuarantaene'];
      kosten = addiere(kosten, marker(option.kosten));
      if (fremde === 'wahrheit') {
        gewinn = marker(cfg.wahrheit.gemeinschaftsvorrat);
      } else {
        const { stabilitaet, ...extra } = option.seuche;
        kosten = addiere(kosten, marker(extra));
      }
    }

    const saldo = subtrahiere(addiere(addiere(topf, produktion), gewinn), kosten);
    const ueberschuss = positiv(saldo);
    let uebertrag = ueberschuss;

    if (v.ereignisse.letzterFilter === runde) {
      const filter = CONFIG.ereignisse.letzterFilter;
      uebertrag = subtrahiere(uebertrag, kleinere(uebertrag, marker(filter.verlust)));
      filterAusgefallen = true;
      reparaturOffen = true;
    }

    runden.push({ runde, produktion, kosten, saldo, ueberschuss, fehlt: fehlbetrag(saldo), uebertrag });
    topf = uebertrag;
  }
  return runden;
}
