/** Attività scaricabile dal catalogo pubblico Civitas. */

export interface JobSource {
  provider: 'normattiva';
  urn: string | null;
  codice_redazionale: string | null;
  data_pubblicazione_gazzetta: string | null;
  act_title: string | null;
  tipo_atto: string | null;
  article_start: number | null;
  article_end: number | null;
}

export interface JobSummary {
  id: string;
  title: string;
  description: string;
  task_type: string;
  status: string;
  priority: number;
  act_title: string | null;
  act_urn: string | null;
  article_start: number | null;
  article_end: number | null;
  article_count: number | null;
  downloadable: boolean;
  updated_at: string | null;
}

export interface JobDetail extends JobSummary {
  parent_act_pub_id: string | null;
  prompt_task: string | null;
  source: JobSource;
  created_at: string | null;
}

export interface JobListResponse {
  items: JobSummary[];
  total: number;
  limit: number;
  offset: number;
}
