/** Il workset attivo: articoli scaricati, batch e stato di avanzamento. */
import type { JobDetail } from '@/domain/job';
import type { ProviderId } from '@/domain/prompt';
import type { Workset, WorksetBatch, WorksetStats } from '@/domain/workset';
import { loadWorkset, saveWorkset, updateBatch } from '@/services/storage/worksetStore';
import { rebuildBatches, statsFor, articlesForBatch, actUpdatesForBatch } from '@/features/results/batching';
import { parseAiResponse } from '@/features/results/responseParser';
import { startAnalysis } from '@/features/ai/providerFlow';
import { sendMessage, onEvent } from '@/messaging/messages';
import { messageFor } from '@/services/api/errors';
import { settingsStore } from './settings.svelte';
import { inferUrn } from '@/features/articles/fetchService';

class WorksetStore {
  workset = $state<Workset | null>(null);
  loading = $state(false);
  downloading = $state(false);
  error = $state<string | null>(null);
  /** Batch su cui è in corso la risoluzione del prompt. */
  busyBatchId = $state<string | null>(null);

  get stats(): WorksetStats | null {
    if (!this.workset) return null;
    return statsFor(this.workset, settingsStore.settings.candidateThreshold);
  }

  get progressPercent(): number {
    const progress = this.workset?.progress;
    if (!progress || progress.total === 0) return 0;
    return Math.min(100, Math.round((progress.fetched / progress.total) * 100));
  }

  getBatch(batchId: string): WorksetBatch | undefined {
    return this.workset?.batches.find((b) => b.id === batchId);
  }

  async load(jobId: string): Promise<void> {
    this.loading = true;
    this.error = null;
    this.busyBatchId = null;
    try {
      const loaded = await loadWorkset(jobId);
      if (loaded) {
        this.workset = { ...loaded };
        this.downloading = this.workset.status === 'downloading';
      } else {
        this.workset = null;
        this.downloading = false;
      }
    } catch (err) {
      this.error = messageFor(err);
    } finally {
      this.loading = false;
    }
  }

  async startDownload(job: JobDetail): Promise<void> {
    this.error = null;
    this.downloading = true;

    const urn = inferUrn(job.title, this.workset?.actUrn || job.source?.urn);
    const existingWorkset = (await loadWorkset(job.id)) ?? this.workset;
    const initialWorkset: Workset = {
      jobId: job.id,
      jobTitle: job.title,
      actUrn: urn,
      status: 'downloading',
      articles: existingWorkset?.articles ?? [],
      batches: existingWorkset?.batches ?? [],
      progress: {
        fetched: existingWorkset?.articles.length ?? 0,
        total: existingWorkset?.progress.total ?? 0,
        lastArticle: null,
        resumeFrom: null,
        error: null,
      },
      createdAt: existingWorkset?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workset = await saveWorkset(initialWorkset);

    const response = await sendMessage({ type: 'START_DOWNLOAD', jobId: job.id });
    if (!response.started) {
      this.downloading = false;
      this.error = response.reason ?? 'Impossibile avviare il download.';
    }
  }

  async cancelDownload(jobId: string): Promise<void> {
    await sendMessage({ type: 'CANCEL_DOWNLOAD', jobId });
    this.downloading = false;
  }

  async resetWorkset(jobId: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      if (this.downloading) {
        await this.cancelDownload(jobId);
      }
      const urn = inferUrn(this.workset?.jobTitle || '', this.workset?.actUrn);
      const emptyWorkset: Workset = {
        jobId,
        actUrn: urn,
        jobTitle: this.workset?.jobTitle ?? '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'empty',
        articles: [],
        batches: [],
        progress: { fetched: 0, total: 0, lastArticle: null, resumeFrom: null, error: null }
      };
      const updated = await saveWorkset(emptyWorkset);
      this.workset = updated;
    } catch (err) {
      this.error = messageFor(err);
    } finally {
      this.loading = false;
    }
  }

  listen(jobId: string): () => void {
    return onEvent((event) => {
      if (event.type !== 'DOWNLOAD_PROGRESS' || event.jobId !== jobId) return;

      void (async () => {
        const loaded = await loadWorkset(jobId);
        if (loaded) {
          this.workset = {
            ...loaded,
            progress: {
              ...loaded.progress,
              fetched: event.fetched,
              total: event.total,
              lastArticle: event.lastArticle,
              error: event.error,
            },
          };
        } else if (this.workset) {
          this.workset.progress = {
            ...this.workset.progress,
            fetched: event.fetched,
            total: event.total,
            lastArticle: event.lastArticle,
            error: event.error,
          };
        }

        if (event.error) {
          this.error = event.error;
        }

        if (event.done || event.error) {
          this.downloading = false;
        } else {
          this.downloading = true;
        }
      })();
    });
  }

  async regenerateBatches(options?: { batchSize?: number; keepImported?: boolean }): Promise<void> {
    if (!this.workset) return;
    this.error = null;

    try {
      const batches = rebuildBatches(
        this.workset,
        {
          batchSize: options?.batchSize ?? settingsStore.effectiveBatchSize,
          threshold: settingsStore.settings.candidateThreshold,
        },
        { keepImported: options?.keepImported ?? true },
      );

      const updated = await saveWorkset({ ...this.workset, batches, status: 'in_progress' });
      this.workset = { ...updated };

      if (batches.length === 0) {
        this.error =
          `Nessun articolo supera la soglia attuale (${settingsStore.settings.candidateThreshold.toFixed(2)}). ` +
          'Abbassala nelle Impostazioni per generare i batch.';
      }
    } catch (err) {
      this.error = messageFor(err);
    }
  }

  articlesOf(batch: WorksetBatch) {
    return this.workset ? articlesForBatch(this.workset, batch) : [];
  }

  actUpdatesOf(batch: WorksetBatch) {
    return this.workset ? actUpdatesForBatch(this.workset, batch) : [];
  }

  async analyzeBatch(batch: WorksetBatch, provider: ProviderId): Promise<string | null> {
    if (!this.workset) return null;

    this.busyBatchId = batch.id;
    this.error = null;
    try {
      const result = await startAnalysis(this.workset, batch, provider);
      await this.load(this.workset.jobId);
      return result.promptContent;
    } catch (err) {
      this.error = messageFor(err);
      await updateBatch(this.workset.jobId, batch.id, {
        status: 'error',
        errorMessage: this.error,
      });
      await this.load(this.workset.jobId);
      return null;
    } finally {
      this.busyBatchId = null;
    }
  }

  /** Salva le bozze in tempo reale sia di ChatGPT che di Gemini. */
  async saveDraftResponses(batchId: string, draftChatGPT: string, draftGemini: string): Promise<void> {
    if (!this.workset) return;

    const patch: Partial<WorksetBatch> = {};
    if (draftChatGPT) patch.rawResponseChatGPT = draftChatGPT;
    if (draftGemini) patch.rawResponseGemini = draftGemini;

    if (Object.keys(patch).length > 0) {
      const updated = await updateBatch(this.workset.jobId, batchId, patch);
      if (updated) this.workset = updated;
    }
  }

  /** Import manuale o approvazione: l'utente incolla o approva il risultato. */
  async importResponse(
    batchId: string,
    rawResponse: string,
    provider?: ProviderId,
    relationDecisions?: Record<string, 'approved' | 'rejected' | 'pending'>,
    editedRelations?: Record<string, ExtractedRelation>
  ): Promise<string | undefined> {
    if (!this.workset) return undefined;

    const parsed = parseAiResponse(rawResponse);
    const existingProvider = this.workset.batches.find((b) => b.id === batchId)?.provider;
    const targetProvider = provider || existingProvider || 'chatgpt';

    const patch: Partial<WorksetBatch> = {
      status: 'imported',
      provider: targetProvider,
      rawResponse,
      relations: parsed.relations,
      parseWarning: parsed.warning,
      relationDecisions,
      editedRelations
    };

    if (targetProvider === 'chatgpt') patch.rawResponseChatGPT = rawResponse;
    if (targetProvider === 'gemini') patch.rawResponseGemini = rawResponse;

    const updated = await updateBatch(this.workset.jobId, batchId, patch);
    if (updated) this.workset = updated;
    return parsed.warning;
  }

  async acceptEmptyBatch(batchId: string): Promise<void> {
    if (!this.workset) return;
    const updated = await updateBatch(this.workset.jobId, batchId, {
      status: 'imported',
      relations: [],
      parseWarning: undefined,
    });
    if (updated) this.workset = updated;
  }
}

export const worksetStore = new WorksetStore();
