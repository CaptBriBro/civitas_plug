/** Catalogo delle attività Civitas. Pubblico: non richiede il collegamento. */
import type { JobDetail, JobSummary } from '@/domain/job';
import { fetchJob, fetchJobs } from '@/services/api/endpoints/jobs';
import { listWorksets, loadWorkset } from '@/services/storage/worksetStore';
import { worksetStore } from './workset.svelte';
import { messageFor } from '@/services/api/errors';

class JobsStore {
  jobs = $state<JobSummary[]>([]);
  total = $state(0);
  loading = $state(false);
  error = $state<string | null>(null);

  search = $state('');
  downloadableOnly = $state(true);

  /** jobId dei workset già presenti in locale, per marcarli nella lista. */
  startedJobIds = $state<Set<string>>(new Set());

  detail = $state<JobDetail | null>(null);
  detailLoading = $state(false);

  get filtered(): JobSummary[] {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.jobs;
    return this.jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) || job.description.toLowerCase().includes(query),
    );
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const [response, worksets] = await Promise.all([
        fetchJobs({ downloadableOnly: this.downloadableOnly, onlyOpen: true, limit: 200 }).catch(() => null),
        listWorksets(),
      ]);

      const localSummaries: JobSummary[] = worksets.map((w) => ({
        id: w.jobId,
        title: w.jobTitle,
        description: 'Attività elaborata in locale.',
        task_type: 'normative_relation_extraction',
        status: w.status,
        priority: 100,
        downloadable: true,
        act_title: w.jobTitle,
        act_urn: w.articles[0]?.urn || null,
        article_start: 1,
        article_end: w.articles.length,
        article_count: w.articles.length,
        updated_at: w.updatedAt || new Date().toISOString(),
      }));

      if (response?.items) {
        const remoteIds = new Set(response.items.map((j) => j.id));
        const extraLocal = localSummaries.filter((l) => !remoteIds.has(l.id));
        this.jobs = [...response.items, ...extraLocal];
        this.total = this.jobs.length;
      } else {
        this.jobs = localSummaries;
        this.total = localSummaries.length;
      }

      this.startedJobIds = new Set(worksets.map((workset) => workset.jobId));
    } catch (err) {
      this.error = messageFor(err);
      this.jobs = [];
    } finally {
      this.loading = false;
    }
  }

  async loadDetail(jobId: string): Promise<JobDetail | null> {
    this.detailLoading = true;
    this.error = null;
    try {
      this.detail = await fetchJob(jobId);
      return this.detail;
    } catch (err) {
      // Fallback: se l'attività è già presente nei workset locali IndexedDB,
      // sintetizza il JobDetail dal workset per consentire l'esame anche offline o se non presente sul server.
      const localWorkset = worksetStore.workset?.jobId === jobId
        ? worksetStore.workset
        : await loadWorkset(jobId);

      if (localWorkset) {
        this.detail = {
          id: localWorkset.jobId,
          title: localWorkset.jobTitle,
          description: 'Attività disponibile e lavorabile in locale.',
          task_type: 'normative_relation_extraction',
          status: localWorkset.status,
          priority: 100,
          downloadable: true,
          act_title: localWorkset.jobTitle,
          act_urn: localWorkset.articles[0]?.urn || null,
          article_start: 1,
          article_end: localWorkset.articles.length,
          article_count: localWorkset.articles.length,
          updated_at: localWorkset.updatedAt || new Date().toISOString(),
          parent_act_pub_id: null,
          prompt_task: 'normative_relation_extraction',
          created_at: localWorkset.updatedAt || new Date().toISOString(),
          source: {
            provider: 'normattiva',
            urn: localWorkset.articles[0]?.urn || null,
            codice_redazionale: null,
            data_pubblicazione_gazzetta: null,
            act_title: localWorkset.jobTitle,
            tipo_atto: null,
            article_start: 1,
            article_end: localWorkset.articles.length,
          },
        };
        this.error = null;
        return this.detail;
      }

      this.error = messageFor(err);
      this.detail = null;
      return null;
    } finally {
      this.detailLoading = false;
    }
  }
}

export const jobsStore = new JobsStore();
