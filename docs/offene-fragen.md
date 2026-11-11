# Offene Fragen und Annahmen zum Regelkern

Die Spielbeschreibung lässt einige Punkte offen. Der Regelkern trifft dafür jeweils eine **Annahme**, damit er lauffähig und testbar ist. Bitte prüfen. Der Abgleich mit dem Material steht in [abgleich-material.md](abgleich-material.md); er hat die Punkte 4, 5 und 6 geklärt (unten markiert). Jede Annahme lässt sich in `src/regeln/` leicht ändern; die Tests zeigen, wo.

## Bitte entscheiden (wirken sich spürbar auf das Spiel aus)

| # | Frage | Annahme im Code |
|---|---|---|
| 1 | **Referenzwert Vollvariante Runde 3** („E fehlt 3, M Rest 0“): Von welchem Ausgang in Runde 2 geht er aus? | Die Fremden sagen die **Wahrheit** (+3 E). Nur dann ergibt sich E fehlt 3. Bei „Seuche“ fehlen in Runde 3 stattdessen E 5 und M 1. Der Test `referenz.test.js` hält das fest. |
| 2 | **Zwangsmaßnahme der Wächter:** Wohin gehen die eingezogenen Marker? | Zu den **Wächtern** (Bestand der Wächter). Alternativen: Bank oder Gemeinschaftsvorrat. |
| 3 | **Seuche** (Runde 2): Aus wessen Beständen kommen die zusätzlichen Medikamente (mit Quarantäne 1, ohne 3), und was gilt, wenn sie fehlen? | Wie bei der Krankheitskarte aus **beliebigen Beständen**, automatisch in der Abrechnung. Fehlende Medikamente bleiben **ohne** Stabilitätsstrafe offen. |
| 4 | ✔ **geklärt:** +3 Energie bei „Wahrheit“ ohne beschlossenen Vorrat. | Das Material: Die Energie kommt in die Schale, die Konferenz verteilt. Der Vorrat ist danach nutzbar. |
| 5 | ✔ **geklärt:** Obergrenze 10 je Einzelbuchung oder für die Summe der Runde? | Das Rundenprotokoll hat je Runde eine Änderung. Alle Änderungen einer Runde werden **addiert**, dann auf 0–10 begrenzt. Beispiel: Stabilität 10, alle Gruppen Stufe 1 (+1) und Krankheitskarte nicht bezahlt (−1) ergibt 10. |
| 6 | ✔ **geklärt:** Weitere Gruppenpunkte? Wer wertet die Geheimkarte? | Nur Geheimkarten, die **Lehrkraft** wertet (Rundenprotokoll). |

## Annahmen ohne große Wirkung (zur Kenntnis)

- **Stufe 3 und Stabilität −1** steht in der Spielbeschreibung zweimal (bei den Stufen und bei der Stabilität). Es wird **einmal** gezählt.
- **Betriebskosten werden automatisch abgebucht**, sobald die Phase „Betriebskosten“ beginnt. Jede Gruppe zahlt je Markerart, so viel sie hat. Freiwillige Teilzahlung gibt es nicht. Wer Marker zurückhalten will, kann das nur, indem er sie vorher tauscht oder verschenkt.
- **Stufe 2 und defekter Filter zusammen:** Die Wasserproduktion beträgt 3 (Filter), davon die Hälfte aufgerundet, also 2. Entsprechendes gilt für den Notstand.
- **Zeitpunkt der Ereignisse:** „Der letzte Filter“ tritt beim Betreten der Ereignisphase von Runde 1 ein und trifft nur den **Bestand der Wasserwerker** (höchstens 2 Wasser). „Unbekannte im Tunnel“ und „Der Notstand“ gelten ab Rundenanfang, weil der Notstand die Produktion der Runde senkt.
- **Wer zahlt Reparatur und Aufnahmekosten:** beliebige Gruppen, einzeln angegeben oder automatisch aus den größten Beständen. Teilzahlungen sind möglich.
- **Aufnahme der Fremden, Kosten nicht bezahlt:** −2 Stabilität („nicht erfüllt“). Die Wirkung des Würfels (Energie oder Seuche) tritt trotzdem ein, weil die Entscheidung verbindlich war.
- **Krankheitskarte:** Was bis zur Abrechnung nicht bezahlt ist, holt die Abrechnung automatisch aus den vorhandenen Medikamenten. Reicht der Bestand nicht, gibt es −1.
- **Referenzrechnung (`referenz.js`):** Fehlbeträge werden nicht in die nächste Runde mitgenommen, Bestände sind nie negativ. Die Wasserreparatur wird in Runde 2 nach der Produktion bezahlt, deshalb ist die Wasserproduktion in Runde 2 noch 3.
- **Zeitlimits** (Notstand 5 bzw. 3 Minuten) stehen in der Konfiguration. Durchgesetzt werden sie später von Timer und Oberfläche. Der Regelkern erkennt nur, ob bis zur Abrechnung ein Beschluss vorliegt.
- **Gruppenfarben:** Grün = Hydroponiker, Blau = Wasserwerker, Orange = Techniker, Rot = Sanitäter, Grau = Wächter. Das ist die Reihenfolge der Gruppen in deiner Liste und passt zu den Gütern.

## Repository

- **Hauptzweig:** Das Repository war schon angelegt, die Arbeit läuft auf dem Zweig `claude/eager-dirac-b0bxbw`. Ein `main` gibt es noch nicht.
- **Lizenz:** Inhaber der MIT-Lizenz ist vorläufig der GitHub-Benutzername. Bitte ersetzen, wenn ein anderer Name erscheinen soll.
- **Material:** Für die PDFs und Folien sollte eine eigene Lizenz festgelegt werden (siehe `material/README.md`).
