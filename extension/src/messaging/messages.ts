/** Helper tipizzati sopra `browser.runtime`. */
import { browser } from 'wxt/browser';
import type { ExtensionEvent, ExtensionMessage, ResponseFor } from './types';

export async function sendMessage<T extends ExtensionMessage>(
  message: T,
): Promise<ResponseFor<T['type']>> {
  return (await browser.runtime.sendMessage(message)) as ResponseFor<T['type']>;
}

/** Broadcast verso le UI aperte. Se nessuna è in ascolto l'errore è atteso. */
export function broadcast(event: ExtensionEvent): void {
  browser.runtime.sendMessage(event).catch(() => {
    /* nessun destinatario: normale quando popup e dashboard sono chiusi */
  });
}

export function onEvent(handler: (event: ExtensionEvent) => void): () => void {
  const listener = (message: unknown) => {
    const candidate = message as Partial<ExtensionEvent>;
    if (candidate?.type === 'DOWNLOAD_PROGRESS') handler(candidate as ExtensionEvent);
  };

  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
