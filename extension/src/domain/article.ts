/** Articolo normativo acquisito da Normattiva. */
import type { ReferenceCandidate } from './candidate';

export interface ArticleVersion {
  versionLabel: string;
  versionOrder: number;
  isCurrent: boolean;
  vigenzaStart: string | null;
  vigenzaEnd: string | null;
  rubrica: string | null;
  testo: string;
}

export interface LegalArticle {
  jobId: string;
  source: 'normattiva';
  urn: string;
  numero: string;
  ordering: number;
  rubrica: string | null;
  /** Percorso strutturale: Libro, Titolo, Capo, Sezione. */
  unitPath: string[];
  testo: string;
  versions: ArticleVersion[];
  fetchedAt: string;
  candidates: ReferenceCandidate[];
  candidateScore: number;
}
