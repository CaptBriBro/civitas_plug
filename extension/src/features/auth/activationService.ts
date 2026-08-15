/** Collegamento dell'account tramite activation code.
 *
 *  Serve solo per sottomettere: consultare le attività, scaricare gli articoli
 *  e preparare i prompt funziona anche senza account.
 */
import { activate, fetchMe, logout } from '@/services/api/endpoints/auth';
import { clearAuth, getAuth, getInstallationId, saveAuth } from '@/services/storage/authStore';
import { AuthError } from '@/services/api/errors';
import type { AuthState } from '@/domain/auth';

const CODE_PATTERN = /^NC(-?[A-Z0-9]{4}){3}$/i;

/** Normalizza quello che l'utente digita: spazi, minuscole, trattini mancanti. */
export function normalizeCode(raw: string): string {
  const cleaned = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('NC') ? cleaned.slice(2) : cleaned;
  const groups = body.match(/.{1,4}/g) ?? [];
  return `NC-${groups.slice(0, 3).join('-')}`;
}

export function isValidCodeFormat(raw: string): boolean {
  return CODE_PATTERN.test(normalizeCode(raw));
}

export async function linkAccount(rawCode: string): Promise<AuthState> {
  const code = normalizeCode(rawCode);
  if (!isValidCodeFormat(code)) {
    throw new AuthError('Il codice deve avere il formato NC-XXXX-XXXX-XXXX.');
  }

  const installationId = await getInstallationId();
  const response = await activate(code, installationId);

  const auth: AuthState = {
    credential: response.credential,
    installationId: response.installation_id,
    scopes: response.scopes,
    user: response.user,
    linkedAt: new Date().toISOString(),
  };

  await saveAuth(auth);
  return auth;
}

/** Verifica che la credenziale sia ancora valida; se revocata la rimuove. */
export async function refreshAccount(): Promise<AuthState | null> {
  const auth = await getAuth();
  if (!auth) return null;

  try {
    const me = await fetchMe(auth.credential, auth.installationId);
    const refreshed: AuthState = { ...auth, user: me.user };
    await saveAuth(refreshed);
    return refreshed;
  } catch (err) {
    if (err instanceof AuthError) {
      await clearAuth();
      return null;
    }
    // Backend irraggiungibile: si conserva la sessione, non è un logout.
    return auth;
  }
}

export async function unlinkAccount(): Promise<void> {
  const auth = await getAuth();

  if (auth) {
    try {
      await logout(auth.credential, auth.installationId);
    } catch {
      // Anche se la revoca remota fallisce, il dato locale va comunque rimosso.
    }
  }

  await clearAuth();
}
