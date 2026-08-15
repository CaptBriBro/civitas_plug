/** Cache locale della configurazione del server (`/plugin/config`).
 *
 *  Interrogare il server ad ogni avvio per un valore che cambia raramente
 *  (dimensione batch, provider abilitati) è la causa delle race condition
 *  viste in fase di test: un'azione locale (generare i batch) che dipende
 *  da un round-trip di rete appena partito. Il valore va preso dal server
 *  una sola volta e poi restare quello finché l'utente non chiede
 *  esplicitamente un aggiornamento.
 */
import { storage } from 'wxt/storage';
import type { PluginConfig } from '@/domain/prompt';

const serverConfigItem = storage.defineItem<PluginConfig | null>('local:civitas_server_config', {
  fallback: null,
});

export function getCachedServerConfig(): Promise<PluginConfig | null> {
  return serverConfigItem.getValue();
}

export function setCachedServerConfig(config: PluginConfig): Promise<void> {
  return serverConfigItem.setValue(config);
}
