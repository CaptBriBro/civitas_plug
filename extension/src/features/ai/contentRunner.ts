/** Logica condivisa dei content script dei provider.
 *
 *  Flusso: chiedo al background se c'è un prompt pendente → trovo il composer
 *  → inserisco → segnalo l'esito. Nient'altro.
 *
 *  In particolare **non** esistono qui funzioni tipo `getLastResponse`,
 *  `waitForResponse` o `observeResponse`: l'estensione non acquisisce mai
 *  automaticamente l'output dei modelli.
 */
import type { ProviderId } from '@/domain/prompt';
import { getAdapter } from '@/adapters/ai/registry';
import { sendMessage } from '@/messaging/messages';

export async function runProviderContentScript(provider: ProviderId): Promise<void> {
  const pending = await sendMessage({ type: 'GET_PENDING_AI_REQUEST', provider }).catch(() => null);

  if (!pending || pending.status !== 'pending') return;

  const adapter = getAdapter(provider);
  const result = await adapter.insertPrompt(pending.prompt);

  if (result.ok) {
    await sendMessage({ type: 'AI_PROMPT_INSERTED', provider, requestId: pending.id });
    return;
  }

  await sendMessage({
    type: 'AI_PROMPT_FAILED',
    provider,
    requestId: pending.id,
    reason: result.reason ?? 'Inserimento non riuscito.',
  });
}
