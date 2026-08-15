/** Client HTTP verso il backend Civitas.
 *
 *  Attende sempre `initEnv()` prima della prima richiesta, così una fetch che
 *  parte al primo tick non finisce sull'endpoint sbagliato. */
import { initEnv, getApiBase } from '@/config/env';
import { getExtensionVersion, getBrowserId } from '@/config/version';
import { ApiError, AuthError, NetworkError } from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Credenziale dell'estensione; se assente la richiesta è anonima. */
  credential?: string | null;
  installationId?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function detailFrom(data: unknown, status: number, statusText: string): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (detail) return JSON.stringify(detail);
  }
  if (status === 404) return 'Risorsa non trovata sul server Civitas.';
  if (status === 500) return 'Errore interno del server Civitas.';
  return statusText || `Errore HTTP ${status}.`;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  await initEnv();

  const url = endpoint.startsWith('http') ? endpoint : `${getApiBase()}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Extension-Version': getExtensionVersion(),
    'X-Extension-Browser': getBrowserId(),
  };

  if (options.credential) headers['Authorization'] = `Bearer ${options.credential}`;
  if (options.installationId) headers['X-Installation-Id'] = options.installationId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  options.signal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    throw new NetworkError(
      aborted
        ? 'Il server Civitas non ha risposto in tempo.'
        : `Impossibile contattare il server Civitas (${getApiBase()}). Verifica che sia raggiungibile e che l'ambiente selezionato sia corretto.`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data: unknown = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (response.ok) return data as T;

  const message = detailFrom(data, response.status, response.statusText);
  if (response.status === 401 || response.status === 403) throw new AuthError(message);
  throw new ApiError(response.status, message, data);
}

export const api = {
  get: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  delete: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
