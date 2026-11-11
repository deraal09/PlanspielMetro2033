// Fehler, die der Regelkern bei regelwidrigen Aktionen wirft.
// Die Meldung ist deutsch und für Anwender gedacht.
export class RegelFehler extends Error {
  constructor(meldung) {
    super(meldung);
    this.name = 'RegelFehler';
  }
}
