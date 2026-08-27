/** Service worker: acquisizione da Normattiva, consegna dei prompt pendenti
 *  ai content script, sync dell'ambiente selezionato dall'utente.
 *
 *  L'acquisizione gira qui — non in una scheda — perché una scheda in
 *  background viene rallentata o sospesa da Chrome quando non è a fuoco, e
 *  lì l'esecuzione si fermerebbe silenziosamente a metà, senza errore. I
 *  parser di Normattiva (`treeParser`/`articleParser`) sono scritti senza
 *  `DOMParser` proprio per poter girare qui: un service worker MV3 non ha DOM.
 */
import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import type { ExtensionMessage } from '@/messaging/types';
import { broadcast } from '@/messaging/messages';
import { refreshEnv } from '@/config/env';
import { fetchJob } from '@/services/api/endpoints/jobs';
import { downloadJobArticles, inferUrn } from '@/features/articles/fetchService';
import { getPending, markPending } from '@/services/storage/pendingStore';
import { getSettings } from '@/services/storage/settingsStore';
import { loadWorkset, updateBatch } from '@/services/storage/worksetStore';
import { messageFor } from '@/services/api/errors';
import type { JobDetail } from '@/domain/job';

export default defineBackground(() => {
  /** Un download per job: ripremere "Scarica" non ne avvia due in parallelo. */
  const activeDownloads = new Map<string, AbortController>();

  async function runDownload(jobId: string): Promise<void> {
    const controller = new AbortController();
    activeDownloads.set(jobId, controller);

    try {
      let job: JobDetail;
      try {
        job = await fetchJob(jobId);
      } catch (fetchErr) {
        const localWorkset = await loadWorkset(jobId);
        if (!localWorkset) throw fetchErr;

        job = {
          id: localWorkset.jobId,
          title: localWorkset.jobTitle,
          description: 'Attività disponibile in locale.',
          task_type: 'normative_relation_extraction',
          status: localWorkset.status,
          priority: 100,
          downloadable: true,
          act_title: localWorkset.jobTitle,
          act_urn: inferUrn(localWorkset.jobTitle, localWorkset.actUrn),
          article_start: 1,
          article_end: localWorkset.articles.length || 100,
          article_count: localWorkset.articles.length || 100,
          updated_at: localWorkset.updatedAt,
          parent_act_pub_id: null,
          prompt_task: 'normative_relation_extraction',
          created_at: localWorkset.createdAt,
          source: {
            provider: 'normattiva',
            urn: inferUrn(localWorkset.jobTitle, localWorkset.actUrn),
            codice_redazionale: null,
            data_pubblicazione_gazzetta: null,
            act_title: localWorkset.jobTitle,
            tipo_atto: null,
            article_start: 1,
            article_end: localWorkset.articles.length || 100,
          },
        };
      }

      const settings = await getSettings();

      const workset = await downloadJobArticles(job, {
        threshold: settings.candidateThreshold,
        signal: controller.signal,
        onProgress: ({ fetched, total, lastArticle }) => {
          broadcast({
            type: 'DOWNLOAD_PROGRESS',
            jobId,
            fetched,
            total,
            lastArticle,
            done: false,
            error: null,
          });
        },
      });

      broadcast({
        type: 'DOWNLOAD_PROGRESS',
        jobId,
        fetched: workset.progress.fetched,
        total: workset.progress.total,
        lastArticle: workset.progress.lastArticle,
        done: true,
        error: workset.progress.error,
      });
    } catch (err) {
      broadcast({
        type: 'DOWNLOAD_PROGRESS',
        jobId,
        fetched: 0,
        total: 0,
        lastArticle: null,
        done: true,
        error: messageFor(err),
      });
    } finally {
      activeDownloads.delete(jobId);
    }
  }

  /** Ogni ramo restituisce una promise: WXT si occupa di tenere aperto il canale. */
  async function handle(message: ExtensionMessage): Promise<unknown> {
    switch (message.type) {
      case 'GET_PENDING_AI_REQUEST':
        return (await getPending(message.provider).catch(() => null)) ?? null;

      case 'AI_PROMPT_INSERTED':
        await markPending(message.provider, 'inserted');
        return { ok: true };

      case 'AI_PROMPT_FAILED': {
        await markPending(message.provider, 'failed', message.reason);
        const pending = await getPending(message.provider);
        if (pending) {
          await updateBatch(pending.jobId, pending.batchId, {
            status: 'prompt_ready',
            errorMessage: message.reason,
          });
        }
        return { ok: true };
      }

      case 'START_DOWNLOAD':
        if (activeDownloads.has(message.jobId)) {
          return { started: false, reason: 'Acquisizione già in corso per questa attività.' };
        }
        void runDownload(message.jobId);
        return { started: true };

      case 'CANCEL_DOWNLOAD':
        activeDownloads.get(message.jobId)?.abort();
        activeDownloads.delete(message.jobId);
        return { cancelled: true };

      case 'ENV_CHANGED':
        await refreshEnv();
        return { ok: true };

      default:
        return undefined;
    }
  }

  browser.runtime.onMessage.addListener((rawMessage: unknown) => {
    const message = rawMessage as ExtensionMessage;
    if (!message?.type || message.type.startsWith('DOWNLOAD_')) return undefined;
    return handle(message);
  });
});
