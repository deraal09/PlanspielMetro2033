# Endstation 7

Digitale Umsetzung des Klassenraum-Planspiels **„Metro 2033: Die letzte Demokratie“** (Politik/WiPo, Berufsschule). Fünf Gruppen von Lernenden verwalten Güter, handeln, bilden eine Regierung und schließen einen Vertrag. Die Lehrkraft leitet das Spiel als Bank und Moderation.

- 15–30 Lernende in 5 Gruppen, Vollvariante 90 Minuten (3 Runden), Kurzvariante 45 Minuten (2 Runden)
- Einstieg ohne Konto per Link und Gruppencode, keine personenbezogenen Daten
- Oberfläche auf Deutsch

## Stand: Phase 0

Die Technik ist **noch nicht entschieden**. Bis dahin gibt es:

- die Entscheidungsvorlage [docs/entscheidung.md](docs/entscheidung.md) mit Empfehlung,
- den **Regelkern** (`src/regeln/`), unabhängig von jeder Oberfläche und mit Tests abgesichert,
- die Spielzahlen in **einer** Konfigurationsdatei, [src/regeln/config.js](src/regeln/config.js),
- die Liste offener Fragen und Annahmen: [docs/offene-fragen.md](docs/offene-fragen.md).

Es gibt noch keinen Oberflächencode und keinen Server.

## Tests ausführen

Voraussetzung: Node.js ab Version 20. Es gibt keine Abhängigkeiten, also auch kein `npm install`.

```bash
npm test
```

## Ordner

| Ordner | Inhalt |
|---|---|
| `docs/` | Entscheidungsvorlage, offene Fragen, Designhinweise |
| `src/regeln/` | Regelkern (reines JavaScript, läuft in Node und im Browser) |
| `tests/` | Tests des Regelkerns (`node:test`) |
| `material/` | Dateien des physischen Spiels (PDFs, Präsentation, LaTeX); werden nachgereicht |

## Regelkern in Kürze

Der Spielzustand ist ein JSON-taugliches Objekt. Jede Aktion nimmt den Zustand und liefert einen **neuen** zurück. Regelwidrige Aktionen werfen einen `RegelFehler` mit deutscher Meldung.

```js
import { neuesSpiel, naechstePhase, tausche } from './src/regeln/index.js';

let spiel = neuesSpiel({ variante: 'voll' }); // oder 'kurz'
spiel = naechstePhase(spiel);                 // Runde 1: Produktion wird ausgegeben
spiel = naechstePhase(spiel);                 // Handel
spiel = tausche(spiel, {
  a: 'hydroponiker', b: 'wasserwerker',
  gibtA: { N: 2 }, gibtB: { W: 1 },
});
```

| Datei | Aufgabe |
|---|---|
| `config.js` | alle Zahlen und Texte (Gruppen, Kosten, Varianten, Ereignisse, Stabilität) |
| `marker.js` | Rechnen mit Marker-Objekten |
| `stufen.js` | Stufen und Produktionsmenge |
| `stabilitaet.js` | Bewertung und Verbuchung der Stabilität |
| `spiel.js` | Zustand, Phasen und Aktionen (Tausch, Ereignisse, Zwangsmaßnahme, Gemeinschaftsvorrat, Auswertung) |
| `referenz.js` | Rechnung „ideale Verteilung“ für die Referenzwerte |

Ablauf einer Runde: Produktion → Handel → Politik (ab Runde 2) → Betriebskosten → Krankheitskarte/Ereignis → Abrechnung der Stabilität. Die Lehrkraft schaltet mit `naechstePhase` weiter.

## Datenschutz

Es werden keine personenbezogenen Daten gespeichert. Details und offene Punkte stehen in der Entscheidungsvorlage.

## Konfiguration und Zugangsdaten

Zugangsdaten gehören nicht ins Repository. `.env` wird ignoriert, `.env.example` zeigt die vorgesehenen Einstellungen. Der Regelkern braucht in Phase 0 keine.

## Lizenz

Code: [MIT](LICENSE). Für die Materialien in `material/` ist eine eigene Lizenz zu klären.
