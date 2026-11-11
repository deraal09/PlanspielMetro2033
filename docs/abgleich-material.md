# Abgleich mit dem Material (Metro_Planspiel_komplett.zip)

Geprüft wurden Wiki-Beschreibung, LaTeX-Quellen (Spielleitung, Gruppenkarten, Ereignisse, Material, Vertrag) und `build.py`. Die PDFs selbst habe ich nicht Seite für Seite gelesen; sie werden aus denselben Quellen erzeugt.

## Stimmt mit `src/regeln/config.js` überein

- Gruppentabelle: Startvorräte, Produktion, Betriebskosten, Summe N5 W6 E8 S3
- Krankheitskarten 3/4/5 (Vollvariante) und 3/5 (Kurzvariante), jeweils in Medikamenten
- Runden und Spielzeit: 3 × 16 Stunden bzw. 2 × 24 Stunden, jeweils 48 Stunden gesamt
- Stufen, Stabilitätstabelle, Bewertung 8–10 / 5–7 / 1–4 / 0
- Ereignisse mit Kosten, Würfelregel (1–4 Wahrheit, 5–6 Seuche) und Fristen (Notstand 5 bzw. 3 Minuten)
- Vertragsartikel (7 bzw. 4) und die Texte der Geheimkarten
- Probelauf-Werte, die `referenz.js` reproduziert; Runde 3 nennt das Material „etwa 3 Energie fehlen“
- Gruppenfarben nach Gut: Nahrung grün, Wasser blau, Energie orange, Medikamente rot, Schutzmaterial grau

## Dadurch geklärt

| Frage aus `offene-fragen.md` | Antwort aus dem Material |
|---|---|
| Stabilität je Einzelbuchung oder je Runde begrenzen | Das Rundenprotokoll hat je Runde **eine** Zeile „Änderung / Stand“. Also wird die Rundensumme verbucht und dann begrenzt, wie im Regelkern. |
| Wer entscheidet über erfüllte Geheimkarten, gibt es weitere Punkte | Die **Lehrkraft** kreuzt im Rundenprotokoll „Geheimauftrag erfüllt? ja/nein“ an. Es gibt 3 Gruppenpunkte, nur bei Stabilität ≥ 1. Weitere Punkte stehen nicht im Material. |
| Gemeinschaftsvorrat nach „Wahrheit“ | Die Lehrkraft legt 3 Energie in die Schale des Gemeinschaftsvorrats, „die Konferenz entscheidet über die Verteilung“. Der Regelkern behandelt den Vorrat danach als nutzbar, auch ohne festgelegten Verwalter. |
| Referenz Runde 3 | Das Material schreibt für Runde 2 „Energie reicht nur, wenn die Fremden die Wahrheit sagen“. Das stützt die Annahme, dass der Referenzwert von „Wahrheit“ ausgeht. |

## Weiterhin offen

- Wohin gehen die Marker der **Zwangsmaßnahme**? Das Material sagt nur „einziehen“.
- Woher kommen die zusätzlichen Medikamente bei **Seuche**? Das Material nennt nur die Menge.

## Abweichungen und Hinweise

- **Farbe Techniker:** Im Material (LaTeX und `build.py`) ist Energie `#d67800`. Dein Auftrag nennt `#b35f00`. Im Regelkern steht `#b35f00`. Welche gilt für die Oberfläche? Vermutlich ist `#b35f00` die dunklere Variante für lesbaren Text.
- **Station Sanitäter:** Auf den Gruppenkarten heißt sie „Krankenstation und Quarantänebereich“, in deiner Tabelle „Krankenstation“. Im Regelkern steht „Krankenstation“.
- **Zeitplan:** Der Ablaufplan der Spielleitung liegt jetzt als `zeitplan` in der Konfiguration (Minuten je Phase). Der Timer wird ihn später nutzen.
- **Präsentation:** Im Archiv fehlt die Präsentation. Enthalten sind nur PDFs, LaTeX, HTML-Quellen und `build.py`.
- **Weitere Inhalte für die Oberfläche:** Interessen, Dilemmata und Machtmittel der Gruppen, Arbeitsblatt, Infokarten und Durchsagen liegen als Text in `LaTeX/metro_lib/`. Sie lassen sich später für die Gruppenansicht übernehmen. Das gehört nicht in den Regelkern.
