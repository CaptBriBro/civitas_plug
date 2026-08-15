import { api } from '../client';
import type { PluginConfig } from '@/domain/prompt';

/** Capability negotiation: provider abilitati, versione minima, dimensione batch. */
export function fetchPluginConfig(): Promise<PluginConfig> {
  return api.get<PluginConfig>('/plugin/config', { timeoutMs: 8000 });
}
