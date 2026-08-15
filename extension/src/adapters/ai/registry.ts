/** Registro dei provider supportati.
 *
 *  La UI itera su questo registro: aggiungere un provider non richiede di
 *  toccare i componenti.
 */
import type { ProviderId } from '@/domain/prompt';
import type { AiProviderAdapter } from './types';
import { chatGptAdapter } from './chatgpt';
import { geminiAdapter } from './gemini';

export const providerRegistry: Record<ProviderId, AiProviderAdapter> = {
  chatgpt: chatGptAdapter,
  gemini: geminiAdapter,
};

export function getAdapter(id: ProviderId): AiProviderAdapter {
  return providerRegistry[id];
}

export function adapterForUrl(url: string): AiProviderAdapter | undefined {
  return Object.values(providerRegistry).find((adapter) => adapter.isSupportedUrl(url));
}
