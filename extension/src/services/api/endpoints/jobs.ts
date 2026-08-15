import { api } from '../client';
import type { JobDetail, JobListResponse } from '@/domain/job';

export interface JobQuery {
  search?: string;
  taskType?: string;
  onlyOpen?: boolean;
  downloadableOnly?: boolean;
  limit?: number;
  offset?: number;
}

/** Catalogo pubblico: non richiede il collegamento dell'account. */
export function fetchJobs(query: JobQuery = {}): Promise<JobListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.taskType) params.set('task_type', query.taskType);
  if (query.onlyOpen !== undefined) params.set('only_open', String(query.onlyOpen));
  if (query.downloadableOnly !== undefined)
    params.set('downloadable_only', String(query.downloadableOnly));
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));

  return api.get<JobListResponse>(`/plugin/jobs?${params.toString()}`);
}

export function fetchJob(jobId: string): Promise<JobDetail> {
  return api.get<JobDetail>(`/plugin/jobs/${encodeURIComponent(jobId)}`);
}
