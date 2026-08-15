/** Validazione della risposta del Prompt API.
 *
 *  Un prompt incompleto non deve mai arrivare al provider: meglio mostrare
 *  "Riprova" che aprire una chat con istruzioni monche.
 */
import type { PromptResolveResponse, ProviderId } from '@/domain/prompt';
import { PromptError } from '@/services/api/errors';

/** Oltre questa soglia il composer di un provider tende a troncare. */
export const MAX_PROMPT_LENGTH = 120_000;

export function validatePromptResponse(
  response: PromptResolveResponse,
  expectedProvider: ProviderId,
): PromptResolveResponse {
  if (!response?.request_id) {
    throw new PromptError('Risposta del server priva di identificativo della richiesta.');
  }

  const prompt = response.prompt;
  if (!prompt?.id || !prompt.version) {
    throw new PromptError('Il prompt ricevuto non è versionato correttamente.');
  }
  if (!prompt.content || !prompt.content.trim()) {
    throw new PromptError('Il prompt ricevuto è vuoto.');
  }
  if (prompt.content.length > MAX_PROMPT_LENGTH) {
    throw new PromptError(
      'Il prompt supera la dimensione gestibile: riduci il numero di articoli per batch.',
    );
  }
  if (response.provider !== expectedProvider) {
    throw new PromptError(
      `Il server ha restituito un prompt per ${response.provider} invece che per ${expectedProvider}.`,
    );
  }
  if (isExpired(response.expires_at)) {
    throw new PromptError('Il prompt ricevuto risulta già scaduto.');
  }

  return response;
}

export function isExpired(expiresAt: string | undefined | null): boolean {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}
