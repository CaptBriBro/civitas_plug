/** Router minimale basato sull'hash.
 *
 *  Una dashboard con cinque schermate non ha bisogno di SvelteKit: bastano
 *  l'hash e un pattern.
 *
 *  Rotte: #/  #/job/:jobId  #/job/:jobId/batch/:batchId  #/job/:jobId/batch/:batchId/compare  #/link  #/settings
 */

export type RouteName = 'jobs' | 'job' | 'batch' | 'batch-compare' | 'link' | 'settings';

export interface Route {
  name: RouteName;
  jobId?: string;
  batchId?: string;
}

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'job' && segments[1]) {
    if (segments[2] === 'batch' && segments[3]) {
      if (segments[4] === 'compare') {
        return { name: 'batch-compare', jobId: decodeURIComponent(segments[1]), batchId: segments[3] };
      }
      return { name: 'batch', jobId: decodeURIComponent(segments[1]), batchId: segments[3] };
    }
    return { name: 'job', jobId: decodeURIComponent(segments[1]) };
  }

  if (segments[0] === 'link') return { name: 'link' };
  if (segments[0] === 'settings') return { name: 'settings' };
  return { name: 'jobs' };
}

class Router {
  route = $state<Route>({ name: 'jobs' });

  start(): () => void {
    const sync = () => (this.route = parse(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }

  go(hash: string): void {
    window.location.hash = hash;
  }

  toJobs(): void {
    this.go('#/');
  }

  toJob(jobId: string): void {
    this.go(`#/job/${encodeURIComponent(jobId)}`);
  }

  toBatch(jobId: string, batchId: string): void {
    this.go(`#/job/${encodeURIComponent(jobId)}/batch/${batchId}`);
  }

  toBatchCompare(jobId: string, batchId: string): void {
    this.go(`#/job/${encodeURIComponent(jobId)}/batch/${batchId}/compare`);
  }
}

export const router = new Router();
