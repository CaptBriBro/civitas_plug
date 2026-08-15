/** Impostazioni utente e ambiente backend selezionato. */
import { DEFAULT_SETTINGS, getSettings, updateSettings, type UserSettings } from '@/services/storage/settingsStore';
import { API_PRESETS, getApiBase, getEnv, initEnv, isDevEnv, setEnv, type EnvId } from '@/config/env';
import { fetchPluginConfig } from '@/services/api/endpoints/config';
import { getCachedServerConfig, setCachedServerConfig } from '@/services/storage/serverConfigStore';
import type { PluginConfig } from '@/domain/prompt';
import { messageFor } from '@/services/api/errors';
import { sendMessage } from '@/messaging/messages';

class SettingsStore {
  settings = $state<UserSettings>(DEFAULT_SETTINGS);
  env = $state<EnvId>('dev');
  apiBase = $state<string>(API_PRESETS[0]!.url);
  serverConfig = $state<PluginConfig | null>(null);
  connectionError = $state<string | null>(null);
  loading = $state(true);

  private loadPromise: Promise<void> | null = null;

  get isDev(): boolean {
    return isDevEnv();
  }

  get envLabel(): string {
    return API_PRESETS.find((preset) => preset.id === this.env)?.label ?? 'Endpoint personalizzato';
  }

  /** La dimensione del batch è una preferenza dell'utente: il server fornisce solo
   *  un valore iniziale alla prima installazione. Durante la generazione dei batch
   *  non viene eseguita alcuna chiamata di rete per controllare limiti. */
  get effectiveBatchSize(): number {
    return this.settings.batchSize;
  }

  load(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.doLoad();
    return this.loadPromise;
  }

  private async doLoad(): Promise<void> {
    this.loading = true;
    try {
      const [state, settings, cached] = await Promise.all([
        initEnv(),
        getSettings(),
        getCachedServerConfig(),
      ]);
      this.env = state.env;
      this.apiBase = state.apiBase;
      this.settings = settings;

      if (cached) {
        this.serverConfig = cached;
        this.connectionError = null;
      } else {
        // Solo alla prima esecuzione in assoluto per un nuovo ambiente si interroga
        // il server per impostare il default iniziale.
        await this.probeServer();
        if (this.serverConfig && (!this.settings.batchSize || this.settings.batchSize === DEFAULT_SETTINGS.batchSize)) {
          this.settings = await updateSettings({ batchSize: this.serverConfig.max_articles_per_batch });
        }
      }
    } finally {
      this.loading = false;
    }
  }

  /** Interroga il server e salva la configurazione in cache. */
  async probeServer(): Promise<void> {
    try {
      const config = await fetchPluginConfig();
      this.serverConfig = config;
      this.connectionError = null;
      await setCachedServerConfig(config);
    } catch (err) {
      this.connectionError = messageFor(err);
    }
  }

  /** Ripristina esplicitamente i default forniti dal server su azione dell'utente. */
  async resetToDefaults(): Promise<void> {
    await this.probeServer();
    if (this.serverConfig) {
      this.settings = await updateSettings({ batchSize: this.serverConfig.max_articles_per_batch });
    }
  }

  async changeEnv(env: EnvId, customUrl?: string): Promise<void> {
    const state = await setEnv(env, customUrl);
    this.env = state.env;
    this.apiBase = state.apiBase;
    await sendMessage({ type: 'ENV_CHANGED' }).catch(() => undefined);
    await this.probeServer();
  }

  async update(patch: Partial<UserSettings>): Promise<void> {
    this.settings = await updateSettings(patch);
  }

  refreshFromStorage(): void {
    this.env = getEnv();
    this.apiBase = getApiBase();
  }
}

export const settingsStore = new SettingsStore();
