/** Fabbrica condivisa degli adapter.
 *
 *  ChatGPT e Gemini differiscono solo per i selettori: la logica è identica e
 *  vive qui, invece di essere duplicata in due file quasi uguali.
 */
import type { ConversationState, ProviderId } from '@/domain/prompt';
import { PROVIDER_LABELS, PROVIDER_URLS, PROVIDER_URL_PATTERNS, SELECTORS } from './selectors';
import { findComposer, insertTextIntoComposer, type InsertResult } from './insertText';
import type { AiProviderAdapter } from './types';

const COMPOSER_POLL_INTERVAL_MS = 500;
const COMPOSER_TIMEOUT_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Il composer compare dopo l'idratazione della pagina: si attende con polling. */
async function waitForComposer(selectors: string[]): Promise<HTMLElement | null> {
  const deadline = Date.now() + COMPOSER_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const composer = findComposer(selectors);
    if (composer) return composer;
    await sleep(COMPOSER_POLL_INTERVAL_MS);
  }

  return null;
}

export function createAdapter(id: ProviderId): AiProviderAdapter {
  const selectors = SELECTORS[id];

  return {
    id,
    label: PROVIDER_LABELS[id],

    getUrl: () => PROVIDER_URLS[id],

    isSupportedUrl: (url: string) => PROVIDER_URL_PATTERNS[id].test(url),

    async detectConversationState(): Promise<ConversationState> {
      // Solo struttura: si guarda se esistono turni, non cosa contengono.
      const hasExisting = selectors.existingConversationIndicators.some((selector) =>
        document.querySelector(selector),
      );
      if (hasExisting) return 'existing';

      const hasNew = selectors.newConversationIndicators.some((selector) =>
        document.querySelector(selector),
      );
      return hasNew ? 'new' : 'unknown';
    },

    async insertPrompt(prompt: string): Promise<InsertResult> {
      const composer = await waitForComposer(selectors.composer);
      if (!composer) {
        return {
          ok: false,
          reason: `Composer di ${PROVIDER_LABELS[id]} non trovato: l'interfaccia potrebbe essere cambiata.`,
        };
      }

      return insertTextIntoComposer(composer, prompt);
    },
  };
}
