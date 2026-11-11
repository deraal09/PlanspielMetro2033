# Entscheidungsvorlage: Technik für „Endstation 7“

Stand: 11.11.2026 · Status: **Vorschlag, Entscheidung offen**

Diese Vorlage vergleicht vier Wege, das Planspiel digital spielbar zu machen. Bis zu deiner Entscheidung gibt es nur den Regelkern (`src/regeln/`) mit Tests und keinen Oberflächencode.

## 1. Kurzfassung

**Empfehlung: Option 1 in schlanker Form.** Das ist ein kleiner Node.js-Server auf deinem Plesk-Server. Er hat:

- keine Datenbank und kein Frontend-Framework,
- **keine WebSockets**: Die Handys fragen den Zustand per Polling alle 2–3 Sekunden ab, optional später per Server-Sent Events,
- Spielstand im Arbeitsspeicher mit einer JSON-Sicherung auf Platte,
- Oberflächen als statische HTML-/JS-Dateien, die auf dem Handy gut bedienbar sind.

Der Regelkern ist schon in JavaScript geschrieben und läuft dort unverändert. Die Lernenden brauchen weder Konto noch App. Sie öffnen einen Link, tippen den Gruppencode ein und spielen.

Die anderen Wege schneiden aus diesen Gründen schlechter ab:

- **Option 2** (Firebase-ähnlicher Dienst) löst das Betriebsproblem, schafft aber ein Datenschutzproblem. Außerdem kann dort niemand die Regeln verlässlich durchsetzen oder den Würfel verdeckt halten.
- **Option 3** (Formulare ohne Echtzeit) ist technisch fast dasselbe wie die Empfehlung, nur ohne automatische Aktualisierung. Das fühlt sich am Handy schlecht an. Sobald man „alle paar Sekunden neu laden“ einbaut, ist es Option 1.
- **Option 4** (Einbettung in Wiki, WordPress, Moodle, BBB) eignet sich als **Zugangsweg**: Ein Link oder `<iframe>` in der Kursseite genügt. Als **Hosting** taugt keine dieser Plattformen für ein Spiel mit gemeinsamem Zustand.

## 2. Anforderungen, die die Technik bestimmen

Aus deinem Auftrag und den Regeln folgt:

| Anforderung | Folge für die Technik |
|---|---|
| 15–30 Lernende, 5 Gruppen, 45/90 Minuten | Sehr geringe Last (≈ 30 Geräte, wenige Anfragen pro Minute). Ein einzelner kleiner Prozess genügt. |
| Handy, kein Konto, Einstieg per Link + Gruppencode | Keine Anmeldeverfahren, keine App-Stores. Die Sitzung wird über einen zufälligen Token pro Gruppe gehalten. |
| Keine personenbezogenen Daten | Nur Spiel-ID, Gruppennummer, Spielzustand. Keine Namen und keine E-Mail-Adressen, keine Cookies außer dem technisch nötigen Sitzungstoken. |
| Tausch mit Angebot/Annahme | Zwei Geräte müssen denselben Zustand sehen. Es braucht eine zentrale Stelle, die den Tausch atomar ausführt. |
| „Server würfelt verdeckt“, Geheimkarten | Das Geheimnis darf nicht im Browser der Lernenden liegen (Entwicklerwerkzeuge). Die Regelprüfung gehört auf eine vertrauenswürdige Seite: den Server oder den Browser der Lehrkraft. |
| Wenig Betrieb | Wenige bewegliche Teile, kein eigener Datenbankserver, einfache Updates. |
| Deutsch, später Beamer-Ansicht | Kein Einfluss auf die Wahl. |

Die Echtzeit-Anforderung ist **weich**. Ein Tauschangebot darf 2–3 Sekunden brauchen, bis es beim anderen Gerät erscheint. Das ist für ein Planspiel im Unterricht unproblematisch und erlaubt einfachere Technik als WebSockets.

## 3. Die Optionen im Einzelnen

### Option 1: Webanwendung mit eigenem Server (Plesk)

**Beschreibung.** Ein Serverprozess hält den Spielzustand und führt den Regelkern aus. Die Oberflächen (Lehrkraft, Gruppe, später Beamer) sind statische Seiten, die den Zustand per HTTP abfragen oder per Server-Sent Events erhalten.

Zwei Varianten:

- **Node.js** (empfohlen): Der Regelkern ist bereits JavaScript. Ein Server mit `node:http` oder einem kleinen Framework wie Express oder Fastify genügt.
- **Python/FastAPI**: möglich, aber der Regelkern müsste neu geschrieben und doppelt getestet werden.

| Kriterium | Bewertung |
|---|---|
| **Aufwand** | Mittel. Server ca. 400–800 Zeilen plus Oberflächen. Das ist eine grobe Schätzung, keine Messung. Der Regelkern ist fertig. |
| **Wartung** | Gering bis mittel. Node-Version und Abhängigkeiten gelegentlich aktualisieren. Bei Verzicht auf Frameworks gibt es kaum Abhängigkeiten, die veralten. |
| **Hosting** | Plesk bietet eine Node.js-Erweiterung (Passenger-basiert). Sie muss auf deinem Server installiert sein. Das habe ich nicht prüfen können (siehe Abschnitt 6). Python/ASGI (FastAPI) läuft auf Plesk nicht so selbstverständlich; das habe ich nicht geprüft. |
| **Datenschutz** | Gut. Alles läuft auf deinem Server in Deutschland. Es sind keine Dritten beteiligt, abgesehen vom Hosting-Vertrag, den du ohnehin hast. Zu beachten sind Zugriffslogs mit IP-Adressen (Abschnitt 5). |
| **Echtzeit** | Polling alle 2–3 s oder Server-Sent Events: robust und gut genug. WebSockets sind möglich, auf Plesk aber fehleranfälliger (siehe unten). |

**Zu WebSockets auf Plesk.** Laut Plesk-Support funktionieren WebSockets mit Node.js nur, wenn nginx die Seite direkt ausliefert (Proxy-Modus aus, Apache nicht davor). Das lässt sich einstellen, ist aber ein typischer Stolperstein in Foren. Quelle: [Plesk: Does Node.js on Plesk support WebSockets](https://support.plesk.com/hc/en-us/articles/12377246437399-Does-Node-js-on-Plesk-support-WebSockets-socket-io). Für dieses Spiel brauchen wir WebSockets nicht. Deshalb ist Polling der Standard und wir sparen uns diese Konfiguration.

**Risiken.**

- Ein Neustart des Prozesses verliert den Zustand, wenn nicht gesichert wird. Gegenmittel: Nach jeder Aktion den Zustand als JSON in eine Datei schreiben (Spiele sind klein, wenige KB).
- Die Node-Erweiterung muss in einer passenden Version verfügbar sein (der Regelkern nutzt Node ≥ 20).

### Option 2: Statische Seite plus Fremddienst für gemeinsamen Zustand

**Beschreibung.** Die Oberfläche liegt als statische Seite irgendwo, der Zustand liegt bei einem Dienst wie Firebase (Google), Supabase oder Appwrite. Ein Sonderfall ist PocketBase, ein einzelnes Programm mit Datenbank und Echtzeit, das man selbst betreibt.

| Kriterium | Bewertung |
|---|---|
| **Aufwand** | Zu Beginn klein (kein eigener Server), später mittel. Die Regeln müssen entweder im Browser laufen oder in Cloud-Funktionen. |
| **Wartung** | Gering, solange der Dienst stabil bleibt. Der Anbieter ändert Preise, Kontingente und Schnittstellen. Das liegt außerhalb deiner Kontrolle. |
| **Hosting** | Kein eigener Betrieb. Für PocketBase wäre es wieder ein Prozess auf deinem Server, also kein Vorteil gegenüber Option 1. |
| **Datenschutz** | **Kritisch.** Firebase gehört einem US-Anbieter. Ein Serverstandort in der EU ist wählbar, die Datenschutzfrage bleibt aber: Auftragsverarbeitung, mögliche Drittlandübermittlung, Freigabe durch Schulleitung bzw. Datenschutzbeauftragte. Öffentliche Schulen dürfen oft nur freigegebene Dienste nutzen. Für Spielstände ohne Personenbezug kann das lösbar sein, der Klärungsaufwand bleibt trotzdem. Ich habe das nicht rechtlich geprüft. |
| **Echtzeit** | Sehr gut (eingebaut). |

**Das eigentliche Problem ist Vertrauen, nicht Datenschutz.** Wenn der Regelkern im Browser der Lernenden läuft, kann jede Gruppe mit den Entwicklerwerkzeugen Marker erzeugen oder das Würfelergebnis lesen. Das ist für ein Klassenspiel ein echtes Risiko, denn Berufsschüler probieren das aus. Man könnte den Browser der Lehrkraft zur „Spielleitung“ machen, die als Einzige rechnet und würfelt. Dann hängt das Spiel am Tab der Lehrkraft: Schließt er sich oder bricht das Netz ab, ist das Spiel weg. Das ist nicht wenig Betrieb, sondern nur verlagerter Betrieb.

### Option 3: Zustandsbasiert ohne Echtzeit (Lehrkraft-Tool + Formulare)

**Beschreibung.** Die Lehrkraft bedient ein Werkzeug. Die Gruppen senden Formulare (Tauschangebot, Annahme) und sehen ihren Stand nach dem Neuladen.

| Kriterium | Bewertung |
|---|---|
| **Aufwand** | Der kleinste. Keine Aktualisierungslogik, einfache Seiten. |
| **Wartung** | Gering. |
| **Hosting** | Läuft überall, wo ein serverseitiges Skript läuft. PHP + SQLite würde auf jedem Plesk-Paket laufen, ohne Zusatzerweiterung. Der Regelkern müsste dann aber in PHP neu geschrieben werden (zweite Implementierung, zweite Testsuite). Mit Node entfällt dieser Nachteil. |
| **Datenschutz** | Wie Option 1, falls selbst gehostet. |
| **Echtzeit** | Keine. Ein Angebot sieht man erst nach dem Neuladen. |

**Bewertung.** Ohne Aktualisierung merken die Lernenden Angebote nicht und verhandeln „ins Leere“. Das stört am Handy stark, wo der Bildschirm oft ausgeht. Baut man eine Aktualisierung alle paar Sekunden ein (ein paar Zeilen JavaScript), hat man Option 1. **Option 3 ist deshalb keine eigene Richtung, sondern die Ausbaustufe 0 von Option 1.**

### Option 4: Einbettung in bestehende Plattformen

Ich habe geprüft, ob das überhaupt geht und was es bringt. Die Antwort unterscheidet sich je Plattform:

| Plattform | Kann dort das Spiel *laufen*? | Kann dort ein *Link/iframe* zum Spiel stehen? | Anmerkung |
|---|---|---|---|
| **Moodle** | Nur über ein eigenes PHP-Plugin (Aktivitätsmodul). Das ist Aufwand und Pflege auf der Moodle-Seite. | Ja: Aktivität „URL“ oder **Externes Tool (LTI)** ([Moodle-Doku](https://docs.moodle.org/en/LTI_External_tool_activity)). | LTI übermittelt Nutzerdaten (Name, Rolle), wenn es nicht anonym konfiguriert wird. Das widerspricht „keine personenbezogenen Daten“. Ein einfacher Link ist unproblematisch. |
| **BigBlueButton** | Nein. Im Raum lässt sich keine eigene Anwendung laufen. | Ab BBB 3.0 gibt es eine **Plugin-API**. Das Plugin „Generic Link Share“ zeigt eine Webseite für alle im Raum, sofern sie in einem iframe darstellbar ist ([BBB-Plugins](https://docs.bigbluebutton.org/plugins/)). Plugins werden beim Anlegen der Konferenz aktiviert, brauchen also die Mitwirkung der Betreiber. | Laut Auftrag stellt die Lehrkraft Video und Gruppenräume separat bereit. Die Gruppen brauchen das Spiel auf dem eigenen Handy, nicht im Konferenzraum. Der Nutzen ist klein. |
| **WordPress** | Technisch ja per Plugin, aber WordPress ist für Echtzeit-Zustand ungeeignet (PHP pro Anfrage, keine dauerhaften Prozesse). | Ja: ein HTML-/iframe-Block, sofern die Rolle HTML einfügen darf. | |
| **BBZ-Wiki** | Nein (Wiki-Software). | **Unklar.** Ich weiß nicht, welche Software das BBZ-Wiki nutzt. Bei MediaWiki ist `<iframe>` standardmäßig gesperrt und braucht eine Erweiterung. Ein normaler Link geht immer. | Bitte kurz nachsehen oder mir sagen, welche Software es ist. |

**Fazit zu Option 4.** Das Spiel bleibt eine eigenständige Anwendung. Plattformen verlinken sie nur: In Moodle als URL-Aktivität, im Wiki als Link, bei WordPress notfalls als iframe. Das kostet nichts und lässt sich jederzeit nachrüsten. Für dieses Spiel sprechen **keine** technischen Gründe für Moodle-Plugin oder BBB-Plugin. Die Datenschutz-Einstufung wäre dort schwieriger.

## 4. Vergleich auf einen Blick

| | 1 Server (schlank) | 2 Fremddienst | 3 Formulare | 4 Einbettung |
|---|---|---|---|---|
| Aufwand | mittel | klein → mittel | klein | je nach Plattform groß oder nicht möglich |
| Wartung | gering–mittel | gering (aber fremdbestimmt) | gering | Plugin-Pflege |
| Hosting | Plesk (Node-Erweiterung nötig) | Dienst oder PocketBase | überall | Plattform des Hauses |
| Datenschutz | **gut** (eigener Server) | zu klären, aufwendig | gut | LTI heikel, Link unkritisch |
| Echtzeit | gut (Polling/SSE) | sehr gut | **keine** | n. a. |
| Regeln/Würfel sicher | **ja** (Server) | nur mit Lehrkraft-Browser | ja | n. a. |
| Handy ohne Konto | ja | ja | ja | eingeschränkt |

## 5. Empfehlung und Zuschnitt

**Wir bauen Option 1 in schlanker Form. Für den Zugang genügt ein Link aus Moodle, Wiki oder WordPress.**

Zuschnitt, damit es klein bleibt:

1. **Ein Prozess, keine Datenbank.** Spielzustand im Arbeitsspeicher, nach jeder Aktion als JSON gesichert. Spiele werden nach 24 Stunden automatisch gelöscht.
2. **Polling statt WebSockets.** Jedes Gerät fragt alle 2–3 s ab, die Oberfläche aktualisiert sich nur bei Änderungen. SSE ist später möglich, falls nötig.
3. **Der Regelkern bleibt Quelle der Wahrheit.** Der Server nimmt Aktionen entgegen, ruft den Regelkern auf und speichert das Ergebnis. Die Oberflächen enthalten keine Spielregeln.
4. **Zugang:** Die Lehrkraft legt ein Spiel an und erhält Links für Lehrkraft-Ansicht und fünf Gruppen. Jeder Link enthält einen langen Zufallstoken, zusätzlich gibt es einen kurzen Gruppencode zum Eintippen. Es gibt keine Konten.
5. **Ausbaustufen**, jeweils für sich lauffähig:
   - A: Lehrkraft-Ansicht + Gruppen-Ansicht mit Bestand, Phasen, Timer (Muss).
   - B: Tausch mit Angebot/Annahme (Muss).
   - C: Gemeinschaftsvorrat, Vertragsentwurf mit Abstimmung, Protokoll-Export (Soll).
   - D: Beamer-Ansicht im dunklen Metro-Design, Töne (Kann).

**Datenschutz-Eckpunkte.**

- Gespeichert wird: Spiel-ID, Variante, Gruppennummer, Spielzustand. Namen werden nicht abgefragt.
- Freitextfelder (Vertragsentwurf, Notstandsbeschluss) können versehentlich Namen enthalten. Die Oberfläche weist darauf hin („Bitte keine Namen eintragen“), außerdem gilt die automatische Löschung.
- Der Sitzungstoken liegt im Browser (`localStorage`) und wird nur gebraucht, damit man nach einem Neuladen wieder in der Gruppe ist. Ein Cookie-Banner sollte dafür nicht nötig sein, weil der Token technisch erforderlich ist. Das bitte mit dem Datenschutzbeauftragten gegenprüfen.
- Der Webserver schreibt standardmäßig IP-Adressen in Zugriffslogs. Das ist die einzige Stelle, an der personenbezogene Daten entstehen können. Lösung: kurze Aufbewahrung oder IP-Kürzung in Plesk einstellen.
- HTTPS (Let's Encrypt über Plesk) ist Pflicht.

**Wenn du dich anders entscheidest.**

- *Kein Node auf dem Server:* Dann zuerst klären, ob die Node.js-Erweiterung nachinstalliert werden kann. Alternativ kann ein günstiger VPS den Prozess übernehmen. Eine Neuimplementierung in PHP würde ich nur wählen, wenn beides ausscheidet.
- *Fremddienst gewünscht:* Dann PocketBase selbst hosten (Option 2c) statt Firebase. Das hat dieselben Betriebsfragen wie Option 1, aber der Regelkern müsste dann in dessen Hooks laufen. Das wäre mehr Aufwand, kein weniger.

## 6. Was ich noch von dir brauche

Ich habe diese Punkte nicht prüfen können und nicht geraten:

1. **Plesk:** Ist die Node.js-Erweiterung installiert, und welche Node-Versionen bietet sie an (gebraucht: ≥ 20)? Wie viel Arbeitsspeicher steht der Anwendung zur Verfügung?
2. **Domain:** Unter welcher (Sub-)Domain soll das Spiel laufen? Für die Lernenden sollte der Link kurz und tippbar sein.
3. **BBZ-Wiki:** Welche Software ist das, und darf man dort Links oder iframes setzen?
4. **Datenschutz im Haus:** Gibt es eine Vorgabe oder Freigabeverfahren für neue Webdienste? Soll ich einen Entwurf für die Datenschutz-Dokumentation (Verzeichnis, Hinweistext für Lernende) vorbereiten?

Weitere offene Fragen zu den Spielregeln stehen in [offene-fragen.md](offene-fragen.md).

## 7. Quellen

Recherchiert am 11.11.2026, nicht selbst nachgestellt:

- [Plesk Support: WebSockets mit Node.js auf Plesk](https://support.plesk.com/hc/en-us/articles/12377246437399-Does-Node-js-on-Plesk-support-WebSockets-socket-io)
- [BigBlueButton: Plugins (ab 3.0)](https://docs.bigbluebutton.org/plugins/)
- [Moodle: LTI-Aktivität „Externes Tool“](https://docs.moodle.org/en/LTI_External_tool_activity)
