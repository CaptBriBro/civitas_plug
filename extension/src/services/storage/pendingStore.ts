/** Richiesta AI in attesa di essere inserita nel composer del provider.
 *
 *  Il content script la legge quando la pagina di ChatGPT/Gemini si carica.
 *  Ne esiste al massimo una per provider: la chiave dello store è `provider`.
 */
import type { ProviderId } from '@/domain/prompt';
import { STORE_PENDING, get, put, remove } from './db';

export type PendingStatus = 'pending' | 'inserted' | 'failed' | 'expired';

export interface PendingAiRequest {
  provider: ProviderId;
  id: string;
  jobId: string;
  batchId: string;
  promptRequestId: string;
  promptId: string;
  promptVersion: string;
  promptHash: string;
  prompt: string;
  createdAt: number;
  expiresAt: number;
  status: PendingStatus;
  failureReason?: string;
}

export async function getPending(provider: ProviderId): Promise<PendingAiRequest | undefined> {
  const pending = await get<PendingAiRequest>(STORE_PENDING, provider);
  if (!pending) return undefined;

  if (Date.now() > pending.expiresAt) {
    await remove(STORE_PENDING, provider);
    return undefined;
  }

  return pending;
}

export async function savePending(request: PendingAiRequest): Promise<PendingAiRequest> {
  await put(STORE_PENDING, request);
  return request;
}

export async function markPending(
  provider: ProviderId,
  status: PendingStatus,
  failureReason?: string,
): Promise<void> {
  const pending = await get<PendingAiRequest>(STORE_PENDING, provider);
  if (!pending) return;
  await put(STORE_PENDING, { ...pending, status, failureReason });
}

export function clearPending(provider: ProviderId): Promise<undefined> {
  return remove(STORE_PENDING, provider);
}
