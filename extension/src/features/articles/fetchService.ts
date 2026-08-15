/** Acquisizione degli articoli di un job da Normattiva.
 *
 *  Gira nel background service worker (le host permissions aggirano la CORS
 *  solo lì) e fa checkpoint su IndexedDB dopo ogni articolo: chiudere il
 *  browser a metà scaricamento non perde il lavoro fatto.
 */
import { NormattivaClient } from '@/services/normattiva/client';
import { parseTree } from '@/services/normattiva/treeParser';
import { parseArticleHtml } from '@/services/normattiva/articleParser';
import { isInRange, toLegalArticle } from '@/services/normattiva/mapper';
import type { ArticleRef } from '@/services/normattiva/types';
import type { JobDetail } from '@/domain/job';
import type { LegalArticle } from '@/domain/article';
import type { Workset } from '@/domain/workset';
import { loadWorkset, saveWorkset } from '@/services/storage/worksetStore';
import { NormattivaError } from '@/services/api/errors';

export interface FetchProgress {
  fetched: number;
  total: number;
  lastArticle: string | null;
}

export interface FetchOptions {
  threshold?: number;
  onProgress?: (progress: FetchProgress) => void;
  signal?: AbortSignal;
}

function emptyWorkset(job: JobDetail): Workset {
  const now = new Date().toISOString();
  return {
    jobId: job.id,
    jobTitle: job.title,
    actUrn: job.source.urn,
    status: 'downloading',
    articles: [],
    batches: [],
    progress: { fetched: 0, total: 0, lastArticle: null, resumeFrom: null, error: null },
    createdAt: now,
    updatedAt: now,
  };
}

/** Scarica il testo di ogni versione di un articolo. */
async function fetchArticleVersions(
  client: NormattivaClient,
  ref: ArticleRef,
  urn: string,
): Promise<Array<{ ref: ArticleRef['versions'][number]; parsed: ReturnType<typeof parseArticleHtml> }>> {
  const results = [];

  for (const version of ref.versions) {
    const html = await client.getArticleHtml(version.caricaParams, urn);
    results.push({
      ref: version,
      parsed: parseArticleHtml(html, version.versionLabel, version.versionOrder),
    });
  }

  return results;
}

export async function downloadJobArticles(
  job: JobDetail,
  options: FetchOptions = {},
): Promise<Workset> {
  // Caricato/creato PRIMA di ogni possibile fallimento: se qualcosa va storto
  // più sotto (warm-up, albero vuoto, range senza articoli) l'errore deve
  // poter essere scritto su un workset che esiste già. Un errore mai
  // persistito verrebbe perso al primo `worksetStore.load()` successivo,
  // che ricarica lo stato dallo storage e mostrerebbe "nessun articolo"
  // senza spiegazione.
  let workset = (await loadWorkset(job.id)) ?? emptyWorkset(job);

  async function failWith(message: string): Promise<never> {
    workset = await saveWorkset({
      ...workset,
      status: 'downloading',
      progress: { ...workset.progress, error: message },
    });
    throw new NormattivaError(message);
  }

  const urn = job.source.urn;
  if (!urn) {
    await failWith(
      `L'attività "${job.title}" non ha un URN Normattiva: non è scaricabile dall'estensione.`,
    );
    return workset;
  }

  const alreadyFetched = new Set(workset.articles.map((a) => a.numero));
  const client = new NormattivaClient();

  let tree: ReturnType<typeof parseTree>;
  try {
    const html = await client.getTree(
      urn,
      job.source.codice_redazionale ?? undefined,
      job.source.data_pubblicazione_gazzetta ?? undefined,
    );
    tree = parseTree(html);
  } catch (err) {
    await failWith(err instanceof Error ? err.message : String(err));
    return workset; // irraggiungibile: failWith rilancia sempre
  }

  if (tree.articles.length === 0) {
    // Un albero vuoto non è mai legittimo per un atto reale: quasi sempre
    // significa che Normattiva ha risposto con una pagina generica (sessione
    // non valida, blocco temporaneo) invece dell'atto richiesto.
    await failWith(
      "Normattiva non ha restituito alcun articolo per questo atto: probabile problema di sessione. Riprova tra qualche secondo.",
    );
    return workset;
  }

  const wanted = tree.articles.filter((ref) =>
    isInRange(ref.numero, job.source.article_start, job.source.article_end),
  );

  if (wanted.length === 0) {
    await failWith(
      `Nessun articolo nell'intervallo ${job.source.article_start}-${job.source.article_end} trovato nell'atto scaricato.`,
    );
    return workset;
  }

  workset = await saveWorkset({
    ...workset,
    status: 'downloading',
    progress: { ...workset.progress, total: wanted.length, error: null },
  });

  const articles: LegalArticle[] = [...workset.articles];

  for (const ref of wanted) {
    if (options.signal?.aborted) break;
    if (alreadyFetched.has(ref.numero)) continue;

    try {
      const versions = await fetchArticleVersions(client, ref, urn);
      articles.push(toLegalArticle({ jobId: job.id, urn, ref, versions, threshold: options.threshold }));
    } catch (err) {
      // Un articolo irraggiungibile non deve far fallire l'intero job: si
      // registra l'errore e si prosegue, l'utente potrà riprovare.
      workset = await saveWorkset({
        ...workset,
        articles,
        progress: {
          ...workset.progress,
          fetched: articles.length,
          lastArticle: ref.numero,
          resumeFrom: null,
          error: err instanceof Error ? err.message : String(err),
        },
      });
      continue;
    }

    // Checkpoint dopo ogni articolo.
    workset = await saveWorkset({
      ...workset,
      articles,
      progress: {
        fetched: articles.length,
        total: wanted.length,
        lastArticle: ref.numero,
        resumeFrom: null,
        error: null,
      },
    });

    options.onProgress?.({ fetched: articles.length, total: wanted.length, lastArticle: ref.numero });
  }

  const complete = articles.length >= wanted.length;

  return saveWorkset({
    ...workset,
    articles,
    status: complete ? 'ready' : 'downloading',
    progress: {
      ...workset.progress,
      fetched: articles.length,
      total: wanted.length,
      resumeFrom: complete ? null : articles.length,
    },
  });
}
