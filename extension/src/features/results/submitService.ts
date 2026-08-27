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

export interface SubmitChecklistItem {
  label: string;
  satisfied: boolean;
  help: string;
}

export interface SubmitPreview {
  batches: number;
  articles: number;
  relations: number;
  canSubmit: boolean;
  blockingReason?: string;
  checklist?: SubmitChecklistItem[];
}

export function previewSubmission(workset: Workset, isLinked: boolean): SubmitPreview {
  const imported = workset.batches.filter((batch) => batch.status === 'imported');
  const relations = imported.reduce((total, batch) => total + batch.relations.length, 0);
  const articles = new Set(imported.flatMap((batch) => batch.articleNumbers)).size;

  const isDownloaded = Boolean(
    workset.status === 'ready' &&
    ((workset.articles && workset.articles.length > 0) ||
      (workset.actUpdates && workset.actUpdates.length > 0))
  );
  const hasBatches = Boolean(workset.batches.length > 0);
  const hasAnalyzed = Boolean(workset.batches.some((b) => b.status === 'imported' || (b.relations && b.relations.length > 0)));
  const hasImported = Boolean(imported.length > 0);

  const isUpdatesTask = Boolean(workset.actUpdates && workset.actUpdates.length > 0);

  const checklist: SubmitChecklistItem[] = [
    {
      label: isUpdatesTask ? 'Aggiornamenti atto scaricati' : 'Articoli scaricati',
      satisfied: isDownloaded,
      help: isUpdatesTask
        ? "Avvia e completa l'acquisizione delle novelle nella scheda 'Report'."
        : "Avvia e completa l'acquisizione di tutti gli articoli nella scheda 'Report'.",
    },
    {
      label: isUpdatesTask ? 'Batch di aggiornamenti creati' : 'Batch di articoli creati',
      satisfied: hasBatches,
      help: "Crea almeno un batch nella scheda 'Candidati & Batch'.",
    },
    {
      label: 'Batch analizzati con l\'AI',
      satisfied: hasAnalyzed,
      help: "Invia e analizza i batch usando i prompt forniti per ChatGPT o Gemini.",
    },
    {
      label: 'Batch approvati ed importati',
      satisfied: hasImported,
      help: "Verifica e importa (approva) i risultati del batch analizzato.",
    },
    {
      label: 'Account Civitas collegato',
      satisfied: isLinked,
      help: "Effettua il collegamento del tuo account nella scheda 'Impostazioni'.",
    },
  ];

  const allSatisfied = checklist.every((item) => item.satisfied);

  let blockingReason: string | undefined;
  if (!isDownloaded) {
    blockingReason = "Completa l'acquisizione di tutti gli articoli della legge.";
  } else if (!hasBatches) {
    blockingReason = 'Crea almeno un batch di articoli nella scheda Candidati & Batch.';
  } else if (!hasAnalyzed) {
    blockingReason = 'Invia ed analizza i batch tramite ChatGPT/Gemini.';
  } else if (!hasImported) {
    blockingReason = 'Importa ed approva almeno un batch nella scheda dei Batch.';
  } else if (!isLinked) {
    blockingReason = "Collega il tuo account Civitas nella scheda 'Impostazioni'.";
  } else if (relations === 0) {
    blockingReason = 'Nessun rinvio o relazione normativa trovata nei batch importati.';
  }

  return {
    batches: imported.length,
    articles,
    relations,
    canSubmit: allSatisfied && relations > 0,
    blockingReason,
    checklist,
  };
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
