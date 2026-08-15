/** Preferenze locali dell'utente. */
import { storage } from 'wxt/storage';
import { DEFAULT_THRESHOLD } from '@/parser/confidence';

export interface UserSettings {
  /** Soglia sotto la quale un articolo non viene proposto per l'analisi AI. */
  candidateThreshold: number;
  /** Articoli per batch: sopra il limite del server viene comunque troncato. */
  batchSize: number;
  /** Mostra il prompt completo prima di aprire il provider (debug/trasparenza). */
  previewPrompt: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  candidateThreshold: DEFAULT_THRESHOLD,
  batchSize: 5,
  previewPrompt: false,
};

const settingsItem = storage.defineItem<UserSettings>('local:civitas_settings', {
  fallback: DEFAULT_SETTINGS,
});

export function getSettings(): Promise<UserSettings> {
  return settingsItem.getValue();
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const next = { ...(await settingsItem.getValue()), ...patch };
  await settingsItem.setValue(next);
  return next;
}

export function watchSettings(callback: (settings: UserSettings) => void): () => void {
  return settingsItem.watch((value) => callback(value ?? DEFAULT_SETTINGS));
}
