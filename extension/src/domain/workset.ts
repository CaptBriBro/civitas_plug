/** Il "commit" locale: il lavoro accumulato su un job prima della sottomissione.
 *
 *  Un codice può avere migliaia di articoli: non si manda tutto ad una chat in
 *  un colpo solo. Il workset li spezza in batch, l'utente ne lavora uno alla
 *  volta e sottomette solo quando è convinto del risultato complessivo. */
import type { LegalArticle } from './article';
import type { ProviderId } from './prompt';

export type BatchStatus =
  | 'pending'
  | 'prompt_loading'
  | 'prompt_ready'
  | 'awaiting_ai'
  | 'imported'
  | 'error';

export type WorksetStatus = 'empty' | 'downloading' | 'ready' | 'in_progress' | 'complete';

export interface ExtractedRelation {
  source_article?: string;
  target_article?: string;
  family?: string;
  relation_type?: string;
  evidence?: string;
  confidence?: number;
  extra?: Record<string, unknown>;
}

export interface WorksetBatch {
  id: string;
  articleNumbers: string[];
  status: BatchStatus;
  provider?: ProviderId;
  promptRequestId?: string;
  promptId?: string;
  promptVersion?: string;
  promptHash?: string;
  promptRenderedHash?: string;
  promptContent?: string;
  promptExpiresAt?: string;
  rawResponse?: string;
  rawResponseChatGPT?: string;
  rawResponseGemini?: string;
  relations: ExtractedRelation[];
  parseWarning?: string;
  errorMessage?: string;
  updatedAt: string;
}

export interface DownloadProgress {
  fetched: number;
  total: number;
  lastArticle: string | null;
  /** Numero dell'articolo da cui riprendere dopo un'interruzione. */
  resumeFrom: number | null;
  error: string | null;
}

export interface Workset {
  jobId: string;
  jobTitle: string;
  actUrn: string | null;
  status: WorksetStatus;
  articles: LegalArticle[];
  batches: WorksetBatch[];
  progress: DownloadProgress;
  createdAt: string;
  updatedAt: string;
}

export interface WorksetStats {
  articles: number;
  withCandidates: number;
  batches: number;
  imported: number;
  relations: number;
}
