import { api } from '../client';
import { getExtensionVersion, getBrowserId, getBrowserVersion, REFERENCE_PARSER_VERSION } from '@/config/version';
import type { ExtractedRelation, WorksetBatch } from '@/domain/workset';

export interface SubmissionResponse {
  submission_id: string;
  proposal_id: string | null;
  contribution_id: string | null;
  job_id: string;
  batch_count: number;
  article_count: number;
  relation_count: number;
  status: string;
  message: string;
}

function toPayloadBatch(batch: WorksetBatch) {
  return {
    id: batch.id,
    prompt_request_id: batch.promptRequestId ?? null,
    provider: batch.provider ?? null,
    article_numbers: batch.articleNumbers,
    relations: batch.relations as ExtractedRelation[],
    // Solo un estratto: la risposta integrale del modello resta nel browser.
    raw_response_excerpt: batch.rawResponse?.slice(0, 4000) ?? null,
  };
}

export interface SubmitParams {
  jobId: string;
  reason: string;
  batches: WorksetBatch[];
  credential: string;
  installationId: string;
}

/** Il commit finale: parte solo quando l'utente lo decide. */
export function submitWorkset(params: SubmitParams): Promise<SubmissionResponse> {
  return api.post<SubmissionResponse>(
    '/plugin/proposals',
    {
      job_id: params.jobId,
      reason: params.reason,
      batches: params.batches.map(toPayloadBatch),
      installation_id: params.installationId,
      parser_version: REFERENCE_PARSER_VERSION,
      extension_version: getExtensionVersion(),
      browser: getBrowserId(),
      browser_version: getBrowserVersion() ?? null,
      response_import_method: 'manual_paste',
    },
    { credential: params.credential, installationId: params.installationId, timeoutMs: 30_000 },
  );
}
