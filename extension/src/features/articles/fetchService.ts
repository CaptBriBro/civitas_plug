/** Acquisizione degli articoli di un job da Normattiva.
 *
 *  Gira nel background service worker (le host permissions aggirano la CORS
 *  solo lì) e fa checkpoint su IndexedDB dopo ogni articolo: chiudere il
 *  browser a metà scaricamento non perde il lavoro fatto.
 */
import { NormattivaClient } from '@/services/normattiva/client';
import { parseTree } from '@/services/normattiva/treeParser';
import { parseArticleHtml } from '@/services/normattiva/articleParser';
import { parseActUpdatesHtml } from '@/services/normattiva/actUpdatesParser';
import { isInRange, toLegalArticle } from '@/services/normattiva/mapper';
import type { ArticleRef } from '@/services/normattiva/types';
import type { JobDetail } from '@/domain/job';
import type { LegalArticle } from '@/domain/article';
import type { Workset, ActUpdateEntry } from '@/domain/workset';
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

export function inferUrn(title: string, urn?: string | null): string | null {
  if (urn && urn.trim()) return urn.trim();
  const lower = (title || '').toLowerCase();
  if (lower.includes('preleggi') || lower.includes('disposizioni sulla legge in generale')) {
    return 'urn:nir:stato:regio.decreto:1942-03-16;262';
  }
  if (lower.includes('codice civile')) {
    return 'urn:nir:stato:regio.decreto:1942-03-16;262';
  }
  if (lower.includes('costituzione')) {
    return 'urn:nir:stato:costituzione:1947-12-27';
  }
  return null;
}

function emptyWorkset(job: JobDetail): Workset {
  const now = new Date().toISOString();
  return {
    jobId: job.id,
    jobTitle: job.title,
    actUrn: inferUrn(job.title, job.source?.urn),
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
  let workset = (await loadWorkset(job.id)) ?? emptyWorkset(job);

  async function failWith(message: string): Promise<never> {
    workset = await saveWorkset({
      ...workset,
      status: 'downloading',
      progress: { ...workset.progress, error: message },
    });
    throw new NormattivaError(message);
  }

  const urn = inferUrn(job.title, workset.actUrn || job.source?.urn);
  if (!urn) {
    await failWith(
      `L'attività "${job.title}" non ha un URN Normattiva valido: non è scaricabile dall'estensione.`,
    );
    return workset;
  }

  workset.actUrn = urn;
  const client = new NormattivaClient();

  // Se il task è di tipo ACT_UPDATES, scarica la cronistoria delle modifiche
  if (job.task_type === 'ACT_UPDATES') {
    try {
      const updatesHtml = await client.getActUpdatesHtml(
        urn,
        job.source?.codice_redazionale ?? undefined,
        job.source?.data_pubblicazione_gazzetta ?? undefined,
      );
      const updates = parseActUpdatesHtml(updatesHtml);
      
      workset = await saveWorkset({
        ...workset,
        actUpdates: updates,
        status: 'ready',
        progress: {
          fetched: updates.length,
          total: updates.length,
          lastArticle: updates.length > 0 ? `Aggiornamenti: ${updates.length}` : null,
          resumeFrom: null,
          error: null,
        },
      });

      options.onProgress?.({
        fetched: updates.length,
        total: updates.length,
        lastArticle: `${updates.length} voci`,
      });

      return workset;
    } catch (err) {
      await failWith(err instanceof Error ? err.message : String(err));
      return workset;
    }
  }

  const alreadyFetched = new Set(workset.articles.map((a) => a.numero));

  let tree: ReturnType<typeof parseTree>;
  try {
    const html = await client.getTree(
      urn,
      job.source?.codice_redazionale ?? undefined,
      job.source?.data_pubblicazione_gazzetta ?? undefined,
    );
    tree = parseTree(html);
  } catch (err) {
    await failWith(err instanceof Error ? err.message : String(err));
    return workset;
  }

  if (tree.articles.length === 0) {
    await failWith(
      "Normattiva non ha restituito alcun articolo per questo atto: probabile problema di sessione. Riprova tra qualche secondo.",
    );
    return workset;
  }

  let wanted = tree.articles.filter((ref) =>
    isInRange(ref.numero, job.source?.article_start, job.source?.article_end),
  );

  // Apply dynamic structural filtering if provided by the task metadata
  if (job.source?.exclude_unit_path_pattern) {
    const rx = new RegExp(job.source.exclude_unit_path_pattern, 'i');
    wanted = wanted.filter((ref) => !ref.unitPath.some((p) => rx.test(p)));
  }

  if (job.source?.include_unit_path_pattern) {
    const rx = new RegExp(job.source.include_unit_path_pattern, 'i');
    wanted = wanted.filter((ref) => ref.unitPath.some((p) => rx.test(p)));
  }

  if (job.source?.min_ordering !== undefined && job.source?.min_ordering !== null) {
    wanted = wanted.filter((ref) => ref.ordering >= job.source.min_ordering!);
  }

  if (job.source?.max_ordering !== undefined && job.source?.max_ordering !== null) {
    wanted = wanted.filter((ref) => ref.ordering <= job.source.max_ordering!);
  }

  if (wanted.length === 0) {
    await failWith(
      `Nessun articolo nell'intervallo ${job.source?.article_start ?? 1}-${job.source?.article_end ?? 'fine'} trovato nell'atto scaricato.`,
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
    if (options.signal?.aborted) return workset;
    if (alreadyFetched.has(ref.numero)) continue;

    try {
      const versions = await fetchArticleVersions(client, ref, urn);
      if (options.signal?.aborted) return workset;
      articles.push(toLegalArticle({ jobId: job.id, urn, ref, versions, threshold: options.threshold }));
    } catch (err) {
      if (options.signal?.aborted) return workset;
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

    if (options.signal?.aborted) return workset;
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

  if (options.signal?.aborted) return workset;

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
