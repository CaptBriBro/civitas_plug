/** Segmento di testo che con buona probabilità contiene un rinvio normativo.
 *
 *  Individuato localmente e in modo deterministico: nessun LLM viene usato
 *  per decidere se un testo *possa* contenere riferimenti. */

export type CandidateType =
  | 'article_reference'
  | 'law_reference'
  | 'decree_reference'
  | 'code_reference'
  | 'paragraph_reference'
  | 'generic_normative_reference';

export interface ParsedReference {
  article?: string;
  lawType?: string;
  lawNumber?: string;
  lawYear?: number;
}

export interface ReferenceCandidate {
  id: string;
  /** Frammento di testo che ha prodotto il match, con un po' di contesto. */
  text: string;
  start: number;
  end: number;
  confidence: number;
  type: CandidateType;
  /** Etichetta leggibile della famiglia rilevata (es. "Abrogazione"). */
  label: string;
  parsed?: ParsedReference;
}

export interface CandidateAnalysis {
  candidateScore: number;
  hasCandidates: boolean;
  matchedLabels: string[];
  candidates: ReferenceCandidate[];
  recommendedAction:
    | 'HIGH_PROBABILITY'
    | 'MEDIUM_PROBABILITY'
    | 'LOW_PROBABILITY'
    | 'NO_RELATIONS';
}
