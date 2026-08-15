/** Contratto comune dei provider AI.
 *
 *  Aggiungere Claude o Perplexity significa implementare questa interfaccia e
 *  registrarla: nessuna modifica alla UI né al resto dell'estensione.
 */
import type { ConversationState, ProviderId } from '@/domain/prompt';
import type { InsertResult } from './insertText';

export interface AiProviderAdapter {
  id: ProviderId;
  label: string;

  getUrl(): string;
  isSupportedUrl(url: string): boolean;

  /** Stato strutturale della conversazione. Nessuna lettura dei contenuti. */
  detectConversationState(): Promise<ConversationState>;

  /** Inserisce il prompt nel composer. Non invia mai il messaggio. */
  insertPrompt(prompt: string): Promise<InsertResult>;
}

export type { InsertResult };
