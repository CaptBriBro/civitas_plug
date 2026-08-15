/** Protocollo di messaggistica interno, tipizzato in un solo punto.
 *
 *  Niente stringhe magiche sparse: ogni messaggio è una variante di questa
 *  unione discriminata, e le risposte sono associate per tipo.
 */
import type { ProviderId } from '@/domain/prompt';
import type { PendingAiRequest } from '@/services/storage/pendingStore';

export type ExtensionMessage =
  /** Content script → background, all'apertura della pagina del provider. */
  | { type: 'GET_PENDING_AI_REQUEST'; provider: ProviderId }
  /** Content script → background, dopo un inserimento riuscito. */
  | { type: 'AI_PROMPT_INSERTED'; provider: ProviderId; requestId: string }
  /** Content script → background, se il composer non è stato trovato. */
  | { type: 'AI_PROMPT_FAILED'; provider: ProviderId; requestId: string; reason: string }
  /** UI → background, per scaricare un job da Normattiva. */
  | { type: 'START_DOWNLOAD'; jobId: string }
  /** UI → background, per interrompere un download in corso. */
  | { type: 'CANCEL_DOWNLOAD'; jobId: string }
  /** UI → background, dopo un cambio di ambiente nelle impostazioni. */
  | { type: 'ENV_CHANGED' };

export interface DownloadProgressEvent {
  type: 'DOWNLOAD_PROGRESS';
  jobId: string;
  fetched: number;
  total: number;
  lastArticle: string | null;
  done: boolean;
  error: string | null;
}

/** Broadcast dal background verso ogni UI aperta. */
export type ExtensionEvent = DownloadProgressEvent;

export interface MessageResponses {
  GET_PENDING_AI_REQUEST: PendingAiRequest | null;
  AI_PROMPT_INSERTED: { ok: true };
  AI_PROMPT_FAILED: { ok: true };
  START_DOWNLOAD: { started: boolean; reason?: string };
  CANCEL_DOWNLOAD: { cancelled: boolean };
  ENV_CHANGED: { ok: true };
}

export type ResponseFor<T extends ExtensionMessage['type']> = MessageResponses[T];
