# Material

Quellen des physischen Planspiels „Metro 2033: Die letzte Demokratie“.

| Pfad | Inhalt |
|---|---|
| `Wiki_Beschreibung.txt` | Beschreibung für das Wiki (Lernziele, Gruppen, Ablauf, Auswertung) |
| `latex/` | LaTeX-Quellen beider Varianten (`planspiel_metro_90min.tex`, `planspiel_metro_45min.tex`) mit Bibliothek `metro_lib/`. Eigene README mit Kompilieranleitung (XeLaTeX, Schrift DejaVu Sans). |
| `quellen-ohne-latex/build.py` | Erzeugt die PDFs ohne LaTeX (HTML/CSS → Chromium → PDF). Die HTML-Zwischendateien entstehen dabei und sind nicht eingecheckt. |

## Was bewusst fehlt

- **Fertige PDFs:** Sie enthalten das Schullogo in der Kopfzeile. Das Repository ist öffentlich, deshalb liegen sie hier nicht. Sie lassen sich aus den Quellen neu erzeugen.
- **Schullogo:** `latex/latex_exam_lib/bbz-logo.png` ist nicht eingecheckt (steht in `.gitignore`). Wer es lokal dorthin legt, bekommt es automatisch in die Kopfzeile; ohne Datei bleibt die Stelle leer.
- **Autorenkürzel:** In den Kopf- und Fußzeilen steht der Platzhalter „Autor/in“. Vor dem Druck im Kopf der beiden `.tex`-Dateien (`\ihead`) und in `build.py` eintragen.
- **Präsentation:** War nicht im Archiv.

Die LaTeX-Änderungen (Logo optional, Platzhalter) habe ich nicht kompiliert, weil hier kein LaTeX installiert ist. Bitte einmal bauen und prüfen.

## Lizenz

Die MIT-Lizenz im Hauptverzeichnis gilt für den Code. Für die Unterrichtsmaterialien in diesem Ordner sollte die Autorin bzw. der Autor eine eigene Lizenz festlegen (z. B. CC BY-SA 4.0). Die Grafiken sind laut Material eigene TikZ-/SVG-Zeichnungen ohne Fremdrechte.
