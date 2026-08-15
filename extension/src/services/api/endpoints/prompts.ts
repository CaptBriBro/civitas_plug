import { api } from '../client';
import { getExtensionVersion, getBrowserId, REFERENCE_PARSER_VERSION } from '@/config/version';
import type {
  ConversationState,
  PromptArticleInput,
  PromptResolveResponse,
  ProviderId,
} from '@/domain/prompt';

export interface ResolvePromptParams {
  jobId: string;
  provider: ProviderId;
  articles: PromptArticleInput[];
  task?: string;
  conversationState?: ConversationState;
  installationId?: string | null;
}

/**
 * Chiede a Civitas il prompt per questo batch.
 *
 * Va invocata **al momento del click sul provider**, mai all'apertura del job:
 * solo così l'utente riceve la versione corrente delle istruzioni.
 */
export function resolvePrompt(params: ResolvePromptParams): Promise<PromptResolveResponse> {
  return api.post<PromptResolveResponse>(`/plugin/jobs/${encodeURIComponent(params.jobId)}/ai-prompt`, {
    provider: params.provider,
    articles: params.articles,
    task: params.task ?? null,
    conversation_state: params.conversationState ?? 'unknown',
    installation_id: params.installationId ?? null,
    extension_version: getExtensionVersion(),
    parser_version: REFERENCE_PARSER_VERSION,
    browser: getBrowserId(),
  });
}
