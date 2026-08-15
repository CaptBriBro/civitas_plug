/** Sottomissione del workset a Civitas: il commit finale.
 *
 *  Parte solo quando l'utente lo decide, e solo con i batch effettivamente
 *  importati: i batch ancora in lavorazione restano nel browser.
 */
import type { Workset } from '@/domain/workset';
import { submitWorkset, type SubmissionResponse } from '@/services/api/endpoints/submissions';
import { getAuth } from '@/services/storage/authStore';
import { saveWorkset } from '@/services/storage/worksetStore';
import { AuthError, CivitasError } from '@/services/api/errors';

export interface SubmitPreview {
  batches: number;
  articles: number;
  relations: number;
  canSubmit: boolean;
  blockingReason?: string;
}

export function previewSubmission(workset: Workset, isLinked: boolean): SubmitPreview {
  const imported = workset.batches.filter((batch) => batch.status === 'imported');
  const relations = imported.reduce((total, batch) => total + batch.relations.length, 0);
  const articles = new Set(imported.flatMap((batch) => batch.articleNumbers)).size;

  const preview: SubmitPreview = {
    batches: imported.length,
    articles,
    relations,
    canSubmit: true,
  };

  if (!isLinked) {
    return { ...preview, canSubmit: false, blockingReason: "Collega l'account per sottomettere." };
  }
  if (imported.length === 0) {
    return {
      ...preview,
      canSubmit: false,
      blockingReason: 'Importa almeno una risposta AI prima di sottomettere.',
    };
  }
  if (relations === 0) {
    return {
      ...preview,
      canSubmit: false,
      blockingReason: 'Nessuna relazione normativa da sottomettere nei batch importati.',
    };
  }

  return preview;
}

export async function submit(workset: Workset, reason: string): Promise<SubmissionResponse> {
  const auth = await getAuth();
  if (!auth) {
    throw new AuthError("Collega l'account Civitas per sottomettere la proposta.");
  }

  const imported = workset.batches.filter((batch) => batch.status === 'imported');
  if (imported.length === 0) {
    throw new CivitasError('Nessun batch importato da sottomettere.');
  }

  const response = await submitWorkset({
    jobId: workset.jobId,
    reason,
    batches: imported,
    credential: auth.credential,
    installationId: auth.installationId,
  });

  await saveWorkset({ ...workset, status: 'complete' });
  return response;
}

export function defaultReason(workset: Workset): string {
  const imported = workset.batches.filter((batch) => batch.status === 'imported').length;
  return (
    `Relazioni normative estratte da ${workset.jobTitle} ` +
    `(${imported} ${imported === 1 ? 'batch analizzato' : 'batch analizzati'} tramite l'estensione browser Civitas).`
  );
}
