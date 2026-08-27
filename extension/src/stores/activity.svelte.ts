/** Attività in corso: cosa sta facendo l'estensione adesso, non l'intero catalogo.
 *
 *  Un download può partire dalla dashboard mentre il pannello laterale è
 *  aperto in un'altra pagina: non condividono lo stato in memoria, quindi
 *  qui si fa polling leggero su IndexedDB invece di affidarsi a un unico
 *  contesto "proprietario" del progresso.
 */
import type { Workset } from '@/domain/workset';
import { listWorksets, deleteWorkset } from '@/services/storage/worksetStore';

const POLL_INTERVAL_MS = 1500;

/** "In corso" = qualcosa richiede ancora attenzione dell'utente.
 *  Include 'empty' e 'downloading' per le attività da scaricare o resettate. */
const ACTIVE_STATUSES: Workset['status'][] = ['empty', 'downloading', 'ready', 'in_progress'];

class ActivityStore {
  active = $state<Workset[]>([]);
  loading = $state(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  async refresh(): Promise<void> {
    this.loading = true;
    try {
      const all = await listWorksets();
      
      // Rimuove i vecchi workset obsoleti hardcoded locali (task-cc-*)
      for (const w of all) {
        if (w.jobId.startsWith('task-cc-')) {
          await deleteWorkset(w.jobId);
        }
      }

      const updated = await listWorksets();
      this.active = updated
        .filter((w) => ACTIVE_STATUSES.includes(w.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } finally {
      this.loading = false;
    }
  }

  /** Da chiamare in `onMount`; il valore restituito va passato a `onDestroy`/cleanup. */
  startPolling(): () => void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS);
    return () => {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    };
  }
}

export const activityStore = new ActivityStore();
