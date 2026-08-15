/** Persistenza della credenziale dell'estensione.
 *
 *  Sta in `browser.storage.local` (piccola, letta anche dal background) e non
 *  in localStorage: il service worker non ha accesso a quest'ultimo.
 */
import { storage } from 'wxt/storage';
import type { AuthState } from '@/domain/auth';

const authItem = storage.defineItem<AuthState | null>('local:civitas_auth', { fallback: null });
const installationItem = storage.defineItem<string | null>('local:civitas_installation_id', {
  fallback: null,
});

export function getAuth(): Promise<AuthState | null> {
  return authItem.getValue();
}

export function saveAuth(auth: AuthState): Promise<void> {
  return authItem.setValue(auth);
}

export function clearAuth(): Promise<void> {
  return authItem.setValue(null);
}

/** Identificativo stabile dell'installazione, generato al primo avvio.
 *  È un UUID casuale: mai un fingerprint del dispositivo. */
export async function getInstallationId(): Promise<string> {
  const existing = await installationItem.getValue();
  if (existing) return existing;

  const generated = crypto.randomUUID();
  await installationItem.setValue(generated);
  return generated;
}

export function watchAuth(callback: (auth: AuthState | null) => void): () => void {
  return authItem.watch(callback);
}
