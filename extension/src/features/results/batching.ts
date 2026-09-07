/** Suddivisione degli articoli in batch lavorabili.
 *
 *  Un codice può avere migliaia di articoli: non si incolla tutto in una chat.
 *  Solo gli articoli che superano la soglia del parser entrano nei batch — gli
 *  altri non contengono rinvii e non hanno bisogno di un modello.
 */
import type { LegalArticle } from '@/domain/article';
import type { Workset, WorksetBatch, WorksetStats } from '@/domain/workset';
import { DEFAULT_THRESHOLD } from '@/parser/confidence';

export interface BatchOptions {
  batchSize?: number;
  threshold?: number;
}

export function candidateArticles(
  articles: LegalArticle[],
  threshold = DEFAULT_THRESHOLD,
): LegalArticle[] {
  return articles
    .filter((article) => article.candidateScore >= threshold)
    .sort((a, b) => a.ordering - b.ordering);
}

export function buildBatches(
  articles: LegalArticle[],
  options: BatchOptions = {},
  actUpdates?: any[]
): WorksetBatch[] {
  const size = Math.max(1, options.batchSize ?? (actUpdates && actUpdates.length > 0 ? 10 : 5));
  const now = new Date().toISOString();
  const batches: WorksetBatch[] = [];

  // Se siamo in un task di aggiornamenti atto
  if (actUpdates && actUpdates.length > 0) {
    for (let i = 0; i < actUpdates.length; i += size) {
      const slice = actUpdates.slice(i, i + size);
      batches.push({
        id: `batch-${String(batches.length + 1).padStart(3, '0')}`,
        articleNumbers: slice.map((_: any, idx: number) => String(i + idx)),
        status: 'pending',
        relations: [],
        updatedAt: now,
      });
    }
    return batches;
  }

  const selected = candidateArticles(articles, options.threshold ?? DEFAULT_THRESHOLD);

  for (let i = 0; i < selected.length; i += size) {
    const slice = selected.slice(i, i + size);
    batches.push({
      id: `batch-${String(batches.length + 1).padStart(3, '0')}`,
      articleNumbers: slice.map((article) => article.numero),
      status: 'pending',
      relations: [],
      updatedAt: now,
    });
  }

  return batches;
}

/** Ricalcola i batch conservando il lavoro già importato.
 *
 *  Cambiare soglia o dimensione dei batch non deve buttare via le risposte
 *  che l'utente ha già incollato, a meno che non venga richiesto esplicitamente
 *  con `keepImported: false` (rigenerazione completa, anche dei batch validati). */
export function rebuildBatches(
  workset: Workset,
  options: BatchOptions = {},
  { keepImported = true }: { keepImported?: boolean } = {},
): WorksetBatch[] {
  const imported = keepImported ? workset.batches.filter((batch) => batch.status === 'imported') : [];
  const consumed = new Set(imported.flatMap((batch) => batch.articleNumbers));

  if (workset.actUpdates && workset.actUpdates.length > 0) {
    const remainingWithIndex = workset.actUpdates
      .map((update, origIdx) => ({ update, origIdx }))
      .filter(({ origIdx }) => !consumed.has(String(origIdx)));

    const size = Math.max(1, options.batchSize ?? (workset.actUpdates.length > 0 ? 10 : 5));
    const now = new Date().toISOString();
    const fresh: WorksetBatch[] = [];

    for (let i = 0; i < remainingWithIndex.length; i += size) {
      const slice = remainingWithIndex.slice(i, i + size);
      fresh.push({
        id: `batch-${String(imported.length + fresh.length + 1).padStart(3, '0')}`,
        articleNumbers: slice.map((item) => String(item.origIdx)),
        status: 'pending',
        relations: [],
        updatedAt: now,
      });
    }

    return [...imported, ...fresh];
  }

  const remaining = workset.articles.filter((article) => !consumed.has(article.numero));
  const fresh = buildBatches(remaining, options).map((batch, index) => ({
    ...batch,
    id: `batch-${String(imported.length + index + 1).padStart(3, '0')}`,
  }));

  return [...imported, ...fresh];
}

export function statsFor(workset: Workset, threshold = DEFAULT_THRESHOLD): WorksetStats {
  return {
    articles: workset.articles.length,
    withCandidates: candidateArticles(workset.articles, threshold).length,
    batches: workset.batches.length,
    imported: workset.batches.filter((batch) => batch.status === 'imported').length,
    relations: workset.batches.reduce((total, batch) => total + batch.relations.length, 0),
  };
}

export function articlesForBatch(workset: Workset, batch: WorksetBatch): LegalArticle[] {
  if (!workset || !batch || !workset.articles) return [];
  const wanted = new Set(
    batch.articleNumbers.flatMap((n) => {
      const clean = String(n).replace(/^(art\.|articolo)\s*/i, '').trim().toLowerCase();
      return [String(n), String(n).toLowerCase(), clean, `art. ${clean}`, `art. ${n}`];
    })
  );
  return workset.articles.filter((article) => {
    const artStr = String(article.numero);
    const artClean = artStr.replace(/^(art\.|articolo)\s*/i, '').trim().toLowerCase();
    return wanted.has(artStr) || wanted.has(artClean) || wanted.has(artStr.toLowerCase());
  });
}

export function actUpdatesForBatch(workset: Workset, batch: WorksetBatch): any[] {
  if (!workset || !batch || !workset.actUpdates) return [];
  const wantedIndices = new Set(
    batch.articleNumbers
      .map((n) => parseInt(String(n).trim(), 10))
      .filter((n) => !isNaN(n))
  );
  const matched = workset.actUpdates.filter((_, idx) => wantedIndices.has(idx));
  if (matched.length > 0) return matched;

  // Fallback per vecchi batch che contenevano progr o numeri 1-based
  const wantedStr = new Set(batch.articleNumbers.map((n) => String(n).trim()));
  return workset.actUpdates.filter(
    (u, idx) => wantedStr.has(String(idx)) || (u.progr ? wantedStr.has(String(u.progr).trim()) : false)
  );
}
