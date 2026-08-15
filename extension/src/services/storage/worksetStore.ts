/** Accesso al workset (il "commit" locale) su IndexedDB. */
import type { Workset, WorksetBatch } from '@/domain/workset';
import { STORE_WORKSETS, get, getAll, put, remove } from './db';

export function loadWorkset(jobId: string): Promise<Workset | undefined> {
  return get<Workset>(STORE_WORKSETS, jobId);
}

export function listWorksets(): Promise<Workset[]> {
  return getAll<Workset>(STORE_WORKSETS);
}

export async function saveWorkset(workset: Workset): Promise<Workset> {
  const next = { ...workset, updatedAt: new Date().toISOString() };
  await put(STORE_WORKSETS, next);
  return next;
}

export function deleteWorkset(jobId: string): Promise<undefined> {
  return remove(STORE_WORKSETS, jobId);
}

/** Aggiorna un singolo batch senza riscrivere il resto del workset a mano. */
export async function updateBatch(
  jobId: string,
  batchId: string,
  patch: Partial<WorksetBatch>,
): Promise<Workset | undefined> {
  const workset = await loadWorkset(jobId);
  if (!workset) return undefined;

  const batches = workset.batches.map((batch) =>
    batch.id === batchId ? { ...batch, ...patch, updatedAt: new Date().toISOString() } : batch,
  );

  return saveWorkset({ ...workset, batches });
}
