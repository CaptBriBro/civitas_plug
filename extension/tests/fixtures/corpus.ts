/** Corpus di riferimento per il parser dei rinvii normativi.
 *
 *  Testi reali dell'ordinamento italiano. `expected` indica se l'articolo
 *  dovrebbe superare la soglia ed essere proposto per l'analisi AI.
 */

export interface CorpusEntry {
  input: string;
  expected: boolean;
  note?: string;
}

export const CORPUS: CorpusEntry[] = [
  // --- Contengono rinvii ---
  {
    input:
      "Ai sensi dell'articolo 3 della legge 7 agosto 1990, n. 241, il provvedimento amministrativo deve essere motivato.",
    expected: true,
    note: 'Rinvio esplicito con legge, numero e anno',
  },
  {
    input: 'Sono abrogati gli articoli da 12 a 18 del regio decreto 16 marzo 1942, n. 262.',
    expected: true,
    note: 'Abrogazione espressa',
  },
  {
    input: "In deroga a quanto previsto dall'articolo 1341 del codice civile, le clausole si intendono approvate.",
    expected: true,
    note: 'Deroga + rinvio a codice',
  },
  {
    input: 'Si applicano, in quanto compatibili, le disposizioni del capo II del presente titolo.',
    expected: true,
    note: 'Applicazione per compatibilità',
  },
  {
    input: 'Non è responsabile chi cagiona il danno per legittima difesa, salvo quanto disposto dall\'art. 2045 c.c.',
    expected: true,
    note: 'Fatto salvo + articolo abbreviato con c.c.',
  },
  {
    input: 'Il comma 2 dell\'articolo 7 è sostituito dal seguente.',
    expected: true,
    note: 'Sostituzione con riferimento a comma',
  },
  {
    input: 'Le disposizioni di cui al D.Lgs. 231/2001 trovano applicazione anche agli enti pubblici economici.',
    expected: true,
    note: 'Decreto legislativo abbreviato',
  },
  {
    input:
      'Fermo restando quanto previsto dal decreto del Presidente della Repubblica 6 giugno 2001, n. 380, il permesso è rilasciato entro trenta giorni.',
    expected: true,
    note: 'Fermo restando + D.P.R. esteso',
  },
  {
    input: 'Per quanto non previsto dal presente regolamento si osservano le norme del codice di procedura civile.',
    expected: true,
    note: 'Applicazione residuale + codice di rito',
  },

  // --- Non contengono rinvii ---
  {
    input:
      'Il debitore che non esegue esattamente la prestazione dovuta è tenuto al risarcimento del danno.',
    expected: false,
    note: 'Norma sostanziale senza rinvii',
  },
  {
    input: 'La capacità giuridica si acquista dal momento della nascita.',
    expected: false,
    note: 'Definizione pura',
  },
  {
    input: 'La maggiore età è fissata al compimento del diciottesimo anno.',
    expected: false,
    note: 'Numero presente ma non è un articolo',
  },
  {
    input:
      "Il contratto è l'accordo di due o più parti per costituire, regolare o estinguere tra loro un rapporto giuridico patrimoniale.",
    expected: false,
    note: 'Definizione di contratto',
  },
  {
    input: 'È punito con la reclusione fino a tre anni, salvo che il fatto costituisca più grave reato.',
    expected: false,
    note: 'Falso positivo classico: "salvo che il fatto" non è un rinvio',
  },
  {
    input: 'Il venditore consegna la cosa, salvo patto contrario, nel luogo dove essa si trovava.',
    expected: false,
    note: 'Falso positivo: "salvo patto contrario"',
  },
];
