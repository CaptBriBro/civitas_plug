/** Versioni dichiarate al backend ad ogni richiesta, per audit e compatibilità. */
import { browser } from 'wxt/browser';

/** Versione del parser locale dei riferimenti. Va incrementata quando cambiano
 *  pattern o soglie: il backend la registra insieme alla proposta. */
export const REFERENCE_PARSER_VERSION = '1.0.0';

export function getExtensionVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return '0.0.0';
  }
}

export type BrowserId = 'chrome' | 'firefox' | 'unknown';

export function getBrowserId(): BrowserId {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Chrome/') || ua.includes('Chromium/')) return 'chrome';
  return 'unknown';
}

export function getBrowserVersion(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const match = navigator.userAgent.match(/(?:Firefox|Chrome|Chromium)\/(\d+(?:\.\d+)?)/);
  return match?.[1];
}
