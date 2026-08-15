/** Astrazione sulle API del browser.
 *
 *  Le differenze fra Chrome e Firefox restano confinate qui: il resto del
 *  codice non chiama mai `chrome.*` direttamente.
 */
import { browser } from 'wxt/browser';
import { getBrowserId, type BrowserId } from '@/config/version';

export function getBrowser(): BrowserId {
  return getBrowserId();
}

export async function openTab(url: string): Promise<number | undefined> {
  const tab = await browser.tabs.create({ url, active: true });
  return tab.id;
}

/** Riusa una scheda già aperta sullo stesso provider, ma la ricarica su
 *  `url` invece di limitarsi a metterla a fuoco: altrimenti l'utente si
 *  ritroverebbe nella vecchia conversazione invece che in una chat nuova. */
export async function openProviderTab(url: string, pattern: string): Promise<number | undefined> {
  const existing = await browser.tabs.query({ url: pattern });
  const tab = existing[0];

  if (tab?.id !== undefined) {
    await browser.tabs.update(tab.id, { url, active: true });
    if (tab.windowId !== undefined) await browser.windows.update(tab.windowId, { focused: true });
    return tab.id;
  }

  return openTab(url);
}

export function openDashboard(hash = ''): Promise<number | undefined> {
  return openTab(browser.runtime.getURL(`/dashboard.html${hash}`));
}

/** Apre il pannello laterale nella finestra corrente.
 *
 *  API disponibile solo su Chrome/Chromium: su Firefox il pannello si apre
 *  già dalla toolbar tramite `sidebar_action`, senza bisogno di codice. */
export async function openSidePanel(): Promise<boolean> {
  const chromeGlobal = (
    globalThis as {
      chrome?: {
        windows?: { getCurrent: () => Promise<{ id?: number }> };
        sidePanel?: { open: (opts: { windowId: number }) => Promise<void> };
      };
    }
  ).chrome;

  if (!chromeGlobal?.sidePanel?.open || !chromeGlobal.windows) return false;

  try {
    const current = await chromeGlobal.windows.getCurrent();
    if (current.id === undefined) return false;
    await chromeGlobal.sidePanel.open({ windowId: current.id });
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // Solo scrittura, mai lettura: l'estensione non richiede `clipboardRead`.
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
