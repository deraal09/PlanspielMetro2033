// Alle Spielzahlen und Texte des Regelkerns stehen hier und nur hier.
// Zum Justieren des Spiels reicht es, diese Datei zu ändern.
//
// Marker-Kürzel: N Nahrung, W Wasser, E Energie, M Medikamente, S Schutzmaterial.
// Ein "Marker-Objekt" ist ein Objekt wie { N: 1, W: 2 }; fehlende Arten zählen 0.

function frieren(objekt) {
  for (const wert of Object.values(objekt)) {
    if (wert && typeof wert === 'object') frieren(wert);
  }
  return Object.freeze(objekt);
}

export const CONFIG = frieren({
  // Reihenfolge der Markerarten (wird für Anzeige und Ausgabe verwendet)
  marker: {
    N: 'Nahrung',
    W: 'Wasser',
    E: 'Energie',
    M: 'Medikamente',
    S: 'Schutzmaterial',
  },

  // Gruppen. "produktion" gilt für das eigene "gut". Die Farben sind dem
  // jeweiligen Gut zugeordnet (Annahme, siehe docs/offene-fragen.md).
  gruppen: {
    hydroponiker: {
      nr: 1,
      name: 'Hydroponiker',
      stationen: ['Gewächshaus', 'Pilzkeller'],
      gut: 'N',
      start: { N: 6 },
      produktion: 6,
      betriebskosten: { N: 1, W: 2, E: 2, S: 1 },
      farbe: '#2e7d32',
    },
    wasserwerker: {
      nr: 2,
      name: 'Wasserwerker',
      stationen: ['Pumpenraum', 'Filteranlage'],
      gut: 'W',
      start: { W: 6 },
      produktion: 6,
      betriebskosten: { N: 1, W: 1, E: 2, S: 1 },
      farbe: '#1565c0',
    },
    techniker: {
      nr: 3,
      name: 'Techniker',
      stationen: ['Kraftwerk', 'Werkstatt'],
      gut: 'E',
      start: { E: 5 },
      produktion: 6,
      betriebskosten: { N: 1, W: 1, E: 1, S: 1 },
      farbe: '#b35f00',
    },
    sanitaeter: {
      nr: 4,
      name: 'Sanitäter',
      stationen: ['Krankenstation'],
      gut: 'M',
      start: { M: 4 },
      produktion: 3,
      betriebskosten: { N: 1, W: 1, E: 2 },
      farbe: '#c62828',
    },
    waechter: {
      nr: 5,
      name: 'Wächter',
      stationen: ['Zugangsschleusen', 'Lager'],
      gut: 'S',
      start: { S: 5 },
      produktion: 3,
      betriebskosten: { N: 1, W: 1, E: 1 },
      farbe: '#555a60',
    },
  },

  // Stabilität der Station
  stabilitaet: {
    start: 10,
    max: 10,
    // Änderungen pro Runde (werden in der Abrechnung am Rundenende verbucht)
    aenderungen: {
      alleGruppenStufe1: +1,
      jeGruppeStufe3: -1,
      krankheitskarteUnbezahlt: -1,
      ereignisUnerfuellt: -2,
      zwangsmassnahmeOhneBeschluss: -2,
    },
    bewertung: [
      { von: 8, bis: 10, name: 'stabil' },
      { von: 5, bis: 7, name: 'angespannt' },
      { von: 1, bis: 4, name: 'kritisch' },
      { von: 0, bis: 0, name: 'Zerfall' },
    ],
  },

  // Stufen nach den Betriebskosten
  stufen: {
    // Stufe 2, wenn höchstens dieser Anteil der Kosten unbezahlt blieb; darüber Stufe 3
    stufe2MaxUnbezahltAnteil: 0.5,
    // Faktor auf die Produktion der nächsten Runde; Ergebnis wird aufgerundet
    produktionsfaktor: { 1: 1, 2: 0.5, 3: 0 },
  },

  // Ablauf einer Runde (Reihenfolge fest im Code, hier nur Zahlen)
  runde: {
    politikAbRunde: 2,
  },

  // Varianten. "ereignisse" nennt die Runde, in der das Ereignis eintritt.
  varianten: {
    voll: {
      name: 'Vollvariante',
      dauerMinuten: 90,
      runden: 3,
      spielzeitStundenProRunde: 16,
      krankheitskarten: [3, 4, 5], // Medikamente je Runde
      ereignisse: { letzterFilter: 1, fremde: 2, notstand: 3 },
      notstandFristMinuten: 5,
      // Zeitplan aus dem Ablaufplan der Spielleitung (Minuten, Summe = Dauer).
      // Dient später dem Timer; der Regelkern selbst nutzt ihn nicht.
      zeitplan: [
        { name: 'Zusammenbruch', minuten: 8 },
        { name: 'Gruppenberatung', minuten: 10 },
        { name: 'Runde 1: Freier Handel', minuten: 14 },
        { name: 'Runde 2: Regierungsbildung', minuten: 20 },
        { name: 'Runde 3: Krise', minuten: 18 },
        { name: 'Auswertung', minuten: 18 },
        { name: 'Ausblick', minuten: 2 },
      ],
      vertragsartikel: [
        'Regierungsform',
        'Machtverteilung',
        'Ressourcenverteilung',
        'Rechte der Bewohner',
        'Sicherheit und Konfliktlösung',
        'Notstand',
        'Änderungen und Auflösung',
      ],
    },
    kurz: {
      name: 'Kurzvariante',
      dauerMinuten: 45,
      runden: 2,
      spielzeitStundenProRunde: 24,
      krankheitskarten: [3, 5],
      ereignisse: { letzterFilter: 1, notstand: 2 },
      notstandFristMinuten: 3,
      zeitplan: [
        { name: 'Zusammenbruch', minuten: 5 },
        { name: 'Gruppenberatung', minuten: 5 },
        { name: 'Runde 1: Freier Handel', minuten: 12 },
        { name: 'Runde 2: Ordnung und Krise', minuten: 16 },
        { name: 'Auswertung', minuten: 7 },
      ],
      vertragsartikel: [
        'Regierungsform und Macht',
        'Ressourcen',
        'Rechte, Sicherheit und Konfliktlösung',
        'Notstand',
      ],
    },
  },

  // Ereignisse
  ereignisse: {
    letzterFilter: {
      titel: 'Der letzte Filter',
      zeitpunkt: 'rundenende', // tritt am Ende der genannten Runde ein
      gruppe: 'wasserwerker',
      verlust: { W: 2 }, // verliert die Gruppe sofort (höchstens ihren Bestand)
      produktionDefekt: 3, // Produktion der Gruppe, solange nicht repariert
      reparatur: { E: 2, N: 1 }, // einmalig an die Bank
      fristRunden: 1, // spätestens am Ende der nächsten Runde bezahlen
    },
    fremde: {
      titel: 'Unbekannte im Tunnel',
      zeitpunkt: 'rundenanfang',
      wahrheitBis: 4, // Würfel 1..wahrheitBis: Wahrheit, darüber Seuche
      optionen: {
        ablehnen: { name: 'Ablehnen', kosten: {} },
        mitQuarantaene: {
          name: 'Aufnahme mit Quarantäne',
          kosten: { N: 2, W: 2, M: 1, S: 1 },
          seuche: { M: 1 },
        },
        ohneQuarantaene: {
          name: 'Aufnahme ohne Quarantäne',
          kosten: { N: 2, W: 2 },
          seuche: { M: 3, stabilitaet: -1 },
        },
      },
      // Wirkung, wenn die Aufgenommenen die Wahrheit sagen
      wahrheit: { gemeinschaftsvorrat: { E: 3 } },
    },
    notstand: {
      titel: 'Der Notstand',
      zeitpunkt: 'rundenanfang',
      gut: 'E', // betroffene Produktion
      produktion: 3, // statt der normalen Menge
      // Felder, die der Konferenzbeschluss enthalten muss
      beschlussFelder: ['entscheider', 'dauer', 'kontrolle'],
    },
  },

  // Zwangsmaßnahme der Wächter
  zwangsmassnahme: {
    gruppe: 'waechter',
    proSpiel: 1,
    maxMarker: 2,
  },

  // Geheimkarten (erst in der Auswertung aufdecken)
  geheimkarten: {
    punkte: 3,
    minStabilitaet: 1,
    texte: {
      hydroponiker:
        'Nahrung darf nur gegen Gegenleistung oder mit ihrer Zustimmung eingezogen werden.',
      wasserwerker:
        'Wasserverteilung nach schriftlichen, öffentlichen Regeln und fester Sitz in jedem Entscheidungsgremium.',
      techniker: 'Mitentscheidung (Sitz oder Veto) bei jeder Energieverteilung.',
      sanitaeter:
        'Medikamente nach medizinischem Bedarf; keine Anordnung für Einzelne durch die Regierung.',
      waechter:
        'Eigenständiges Handeln im Notstand; nicht von einer einzelnen Gruppe absetzbar.',
    },
  },
});
