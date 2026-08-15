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

export function buildBatches(articles: LegalArticle[], options: BatchOptions = {}): WorksetBatch[] {
  const size = Math.max(1, options.batchSize ?? 5);
  const selected = candidateArticles(articles, options.threshold ?? DEFAULT_THRESHOLD);
  const now = new Date().toISOString();
  const batches: WorksetBatch[] = [];

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
 *  che l'utente ha già incollato. */
export function rebuildBatches(workset: Workset, options: BatchOptions = {}): WorksetBatch[] {
  const imported = workset.batches.filter((batch) => batch.status === 'imported');
  const consumed = new Set(imported.flatMap((batch) => batch.articleNumbers));

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
