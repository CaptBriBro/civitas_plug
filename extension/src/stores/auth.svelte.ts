/** Stato di collegamento dell'account, condiviso fra popup e dashboard. */
import type { AuthState } from '@/domain/auth';
import { getAuth, watchAuth } from '@/services/storage/authStore';
import { linkAccount, refreshAccount, unlinkAccount } from '@/features/auth/activationService';
import { messageFor } from '@/services/api/errors';

class AuthStore {
  auth = $state<AuthState | null>(null);
  loading = $state(true);
  linking = $state(false);
  error = $state<string | null>(null);

  get isLinked(): boolean {
    return this.auth !== null;
  }

  get displayName(): string {
    if (!this.auth) return 'Non collegato';
    return this.auth.user.full_name || this.auth.user.email;
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      this.auth = await getAuth();
      // Verifica in background: se la credenziale è stata revocata dal web
      // l'estensione se ne accorge senza bloccare il primo render.
      void refreshAccount().then((refreshed) => (this.auth = refreshed));
    } finally {
      this.loading = false;
    }
  }

  async link(code: string): Promise<boolean> {
    this.linking = true;
    this.error = null;
    try {
      this.auth = await linkAccount(code);
      return true;
    } catch (err) {
      this.error = messageFor(err);
      return false;
    } finally {
      this.linking = false;
    }
  }

  async unlink(): Promise<void> {
    await unlinkAccount();
    this.auth = null;
  }

  /** Tiene allineati popup e dashboard quando uno dei due si collega. */
  watch(): () => void {
    return watchAuth((value) => (this.auth = value));
  }
}

export const authStore = new AuthStore();
