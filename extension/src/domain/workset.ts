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

export interface ActUpdateEntry {
  progr?: string | null;
  data_pubblicazione?: string | null;
  atto_modificante?: string | null;
  testo_disposizione: string;
  target_articles_detected: string[];
}

export interface ExtractedRelation {
  source_article?: string;
  target_article?: string;
  target_paragraph?: string;
  family?: string;
  relation_type?: string;
  evidence?: string;
  confidence?: number;
  source_act?: Record<string, unknown>;
  source_act_public_id?: string;
  modifying_act?: Record<string, unknown>;
  is_broken?: boolean;
  broken_reason?: string;
  link_status?: 'RESOLVED_LINK' | 'BROKEN_LINK' | string;
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
  relationDecisions?: Record<string, 'approved' | 'rejected' | 'pending'>;
  editedRelations?: Record<string, ExtractedRelation>;
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
  actUpdates?: ActUpdateEntry[];
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
