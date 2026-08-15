/** Il workset attivo: articoli scaricati, batch e stato di avanzamento. */
import type { JobDetail } from '@/domain/job';
import type { ProviderId } from '@/domain/prompt';
import type { Workset, WorksetBatch, WorksetStats } from '@/domain/workset';
import { loadWorkset, saveWorkset, updateBatch } from '@/services/storage/worksetStore';
import { rebuildBatches, statsFor, articlesForBatch } from '@/features/results/batching';
import { parseAiResponse } from '@/features/results/responseParser';
import { startAnalysis } from '@/features/ai/providerFlow';
import { sendMessage, onEvent } from '@/messaging/messages';
import { messageFor } from '@/services/api/errors';
import { settingsStore } from './settings.svelte';

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

  async load(jobId: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.workset = (await loadWorkset(jobId)) ?? null;
      this.downloading = this.workset?.status === 'downloading';
    } catch (err) {
      this.error = messageFor(err);
    } finally {
      this.loading = false;
    }
  }

  async startDownload(job: JobDetail): Promise<void> {
    this.error = null;
    this.downloading = true;

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
      const emptyWorkset: Workset = {
        jobId,
        actUrn: this.workset?.actUrn ?? null,
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

      if (this.workset) {
        this.workset.progress = {
          ...this.workset.progress,
          fetched: event.fetched,
          total: event.total,
          lastArticle: event.lastArticle,
          error: event.error,
        };

        if (event.done || event.error) {
          this.downloading = false;
          void this.load(jobId);
        }
      }
    });
  }

  async regenerateBatches(): Promise<void> {
    if (!this.workset) return;
    this.error = null;

    try {
      const batches = rebuildBatches(this.workset, {
        batchSize: settingsStore.effectiveBatchSize,
        threshold: settingsStore.settings.candidateThreshold,
      });

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
    provider?: ProviderId
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
