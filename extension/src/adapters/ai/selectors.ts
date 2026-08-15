/** Selettori DOM dei provider, centralizzati in un solo file.
 *
 *  Quando ChatGPT o Gemini cambiano interfaccia si aggiorna qui e basta.
 *  Si preferiscono ruoli, `aria-label` e `data-*` alle classi CSS generate,
 *  che cambiano ad ogni build del provider.
 *
 *  Nota deliberata: **non esiste alcun selettore per i messaggi
 *  dell'assistente**. L'estensione non legge le risposte; l'utente le copia e
 *  le incolla. È una regola di architettura, non una scelta di UI.
 */
import type { ProviderId } from '@/domain/prompt';

export interface ProviderSelectors {
  /** Cascata di selettori del composer, dal più specifico al fallback. */
  composer: string[];
  /** Indizi che la conversazione è nuova (nessun turno precedente). */
  newConversationIndicators: string[];
  /** Indizi che esiste già una conversazione in corso. */
  existingConversationIndicators: string[];
}

export const SELECTORS: Record<ProviderId, ProviderSelectors> = {
  chatgpt: {
    composer: [
      '#prompt-textarea',
      'div#prompt-textarea',
      '#prompt-textarea p',
      'p[data-placeholder]',
      'div[contenteditable="true"][data-virtualkeyboard]',
      'div[contenteditable="true"]',
      'textarea[data-id]',
      'textarea',
    ],
    newConversationIndicators: ['[data-testid="welcome-screen"]', 'main h1', 'div#prompt-textarea'],
    existingConversationIndicators: ['[data-testid^="conversation-turn-"]'],
  },
  gemini: {
    composer: [
      '.ql-editor[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      'div[contenteditable="true"]',
      'p[data-placeholder]',
      'textarea',
    ],
    newConversationIndicators: ['.zero-state-wrapper', '.welcome-screen'],
    existingConversationIndicators: ['.conversation-container', 'chat-turn'],
  },
};

export const PROVIDER_URLS: Record<ProviderId, string> = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
};

export const PROVIDER_URL_PATTERNS: Record<ProviderId, RegExp> = {
  chatgpt: /^https:\/\/chatgpt\.com\//,
  gemini: /^https:\/\/gemini\.google\.com\//,
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
};
