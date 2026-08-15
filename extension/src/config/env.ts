/**
 * Selettore dell'ambiente backend.
 *
 * L'endpoint è scelto a runtime dall'utente (non a build time): la stessa
 * build funziona contro il server locale in sviluppo e contro la produzione.
 *
 * `initEnv()` va atteso prima della prima chiamata API: idratare `API_BASE`
 * da una callback asincrona farebbe partire le prime richieste verso il
 * default sbagliato.
 */
import { storage } from 'wxt/storage';

export type EnvId = 'dev' | 'prod' | 'custom';

export interface EnvPreset {
  id: EnvId;
  label: string;
  url: string;
  description: string;
}

export const API_PRESETS: EnvPreset[] = [
  {
    id: 'dev',
    label: 'Locale (dev)',
    url: 'http://localhost:8030/api/v1',
    description: 'Server civitas_backend in esecuzione sulla tua macchina.',
  },
  {
    id: 'prod',
    label: 'Produzione',
    url: 'https://civitas.org/api/v1',
    description: 'Server ufficiale Civitas.',
  },
];

export const DEFAULT_ENV: EnvId = 'dev';

const envItem = storage.defineItem<EnvId>('local:civitas_env', { fallback: DEFAULT_ENV });
const baseItem = storage.defineItem<string>('local:civitas_api_base', {
  fallback: API_PRESETS[0]!.url,
});

interface EnvState {
  env: EnvId;
  apiBase: string;
}

let state: EnvState = { env: DEFAULT_ENV, apiBase: API_PRESETS[0]!.url };
let ready: Promise<EnvState> | null = null;

function normalizeBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

function presetFor(env: EnvId): EnvPreset | undefined {
  return API_PRESETS.find((p) => p.id === env);
}

/** Carica l'ambiente persistito. Idempotente: le chiamate successive riusano la stessa promise. */
export function initEnv(): Promise<EnvState> {
  if (!ready) {
    ready = (async () => {
      const [env, apiBase] = await Promise.all([envItem.getValue(), baseItem.getValue()]);
      state = { env, apiBase };
      return state;
    })();
  }
  return ready;
}

/** Base URL corrente. Chiamare `initEnv()` almeno una volta prima di usarla. */
export function getApiBase(): string {
  return state.apiBase;
}

export function getEnv(): EnvId {
  return state.env;
}

export function isDevEnv(): boolean {
  return state.env !== 'prod';
}

export async function setEnv(env: EnvId, customUrl?: string): Promise<EnvState> {
  const apiBase =
    env === 'custom' ? normalizeBase(customUrl ?? state.apiBase) : presetFor(env)?.url ?? state.apiBase;

  state = { env, apiBase };
  ready = Promise.resolve(state);
  await Promise.all([envItem.setValue(env), baseItem.setValue(apiBase)]);
  return state;
}

/** Ricarica dallo storage: usato dal background dopo un cambio fatto nel popup. */
export async function refreshEnv(): Promise<EnvState> {
  ready = null;
  return initEnv();
}
