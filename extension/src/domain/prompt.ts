/** Prompt risolto dal backend Civitas.
 *
 *  Il contenuto è dato, mai codice: l'estensione lo inserisce senza
 *  interpretarlo, senza eval e senza sostituzioni arbitrarie. */

export type ProviderId = 'chatgpt' | 'gemini';

export type ConversationState = 'new' | 'existing' | 'unknown';

export interface PromptArticleInput {
  numero: string;
  testo: string;
  rubrica?: string | null;
  version_label?: string | null;
  candidates?: string[];
}

export interface ResolvedPrompt {
  id: string;
  name: string;
  version: string;
  content: string;
  hash: string;
  rendered_hash: string;
}

export interface PromptResolveResponse {
  request_id: string;
  provider: ProviderId;
  task: string;
  prompt: ResolvedPrompt;
  article_count: number;
  generated_at: string;
  expires_at: string;
  cacheable: boolean;
  cache_ttl_seconds: number;
}

export interface PluginConfig {
  enabled: boolean;
  providers: ProviderId[];
  features: Record<string, boolean>;
  min_extension_version: string;
  min_parser_version: string;
  max_articles_per_batch: number;
  max_article_text_chars: number;
  prompt_ttl_seconds: number;
  prompt_cache_ttl_seconds: number;
  activation_code_ttl_seconds: number;
  server_time: string;
}
