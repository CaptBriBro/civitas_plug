import { describe, expect, it } from 'vitest';
import { buildBatches, candidateArticles, rebuildBatches, statsFor } from '@/features/results/batching';
import type { LegalArticle } from '@/domain/article';
import type { Workset } from '@/domain/workset';

function article(numero: string, score: number, ordering: number): LegalArticle {
  return {
    jobId: 'task-test',
    source: 'normattiva',
    urn: 'urn:nir:test',
    numero,
    ordering,
    rubrica: null,
    unitPath: [],
    testo: `Testo dell'articolo ${numero}`,
    versions: [],
    fetchedAt: new Date().toISOString(),
    candidates: [],
    candidateScore: score,
  };
}

const ARTICLES = [
  article('1', 0.9, 1),
  article('2', 0.2, 2),
  article('3', 0.75, 3),
  article('4', 0.95, 4),
  article('5', 0.1, 5),
  article('6', 0.65, 6),
];

function workset(overrides: Partial<Workset> = {}): Workset {
  const now = new Date().toISOString();
  return {
    jobId: 'task-test',
    jobTitle: 'Attività di test',
    actUrn: 'urn:nir:test',
    status: 'ready',
    articles: ARTICLES,
    batches: [],
    progress: { fetched: 6, total: 6, lastArticle: '6', resumeFrom: null, error: null },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('candidateArticles', () => {
  it('tiene solo gli articoli sopra soglia, in ordine di documento', () => {
    const selected = candidateArticles(ARTICLES, 0.6);
    expect(selected.map((a) => a.numero)).toEqual(['1', '3', '4', '6']);
  });

  it('alzando la soglia si restringe la selezione', () => {
    expect(candidateArticles(ARTICLES, 0.9).map((a) => a.numero)).toEqual(['1', '4']);
  });
});

describe('buildBatches', () => {
  it('spezza gli articoli candidati nella dimensione richiesta', () => {
    const batches = buildBatches(ARTICLES, { batchSize: 2, threshold: 0.6 });

    expect(batches).toHaveLength(2);
    expect(batches[0]?.articleNumbers).toEqual(['1', '3']);
    expect(batches[1]?.articleNumbers).toEqual(['4', '6']);
    expect(batches.every((b) => b.status === 'pending')).toBe(true);
  });

  it('non produce batch quando nessun articolo supera la soglia', () => {
    expect(buildBatches(ARTICLES, { threshold: 0.99 })).toHaveLength(0);
  });

  it('tratta una dimensione non valida come 1', () => {
    const batches = buildBatches(ARTICLES, { batchSize: 0, threshold: 0.6 });
    expect(batches).toHaveLength(4);
  });
});

describe('rebuildBatches', () => {
  it('conserva i batch già importati e ricalcola solo il resto', () => {
    const current = workset({
      batches: [
        {
          id: 'batch-001',
          articleNumbers: ['1', '3'],
          status: 'imported',
          relations: [{ source_article: '1', target_article: '3' }],
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'batch-002',
          articleNumbers: ['4', '6'],
          status: 'pending',
          relations: [],
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const rebuilt = rebuildBatches(current, { batchSize: 1, threshold: 0.6 });

    // Il lavoro importato non va perso
    expect(rebuilt[0]?.status).toBe('imported');
    expect(rebuilt[0]?.relations).toHaveLength(1);
    // Gli articoli già consumati non rientrano nei nuovi batch
    const remaining = rebuilt.slice(1).flatMap((b) => b.articleNumbers);
    expect(remaining).not.toContain('1');
    expect(remaining).not.toContain('3');
    expect(remaining).toEqual(['4', '6']);
  });
});

describe('statsFor', () => {
  it('riassume articoli, batch, importati e relazioni', () => {
    const current = workset({
      batches: [
        {
          id: 'batch-001',
          articleNumbers: ['1'],
          status: 'imported',
          relations: [{ source_article: '1' }, { source_article: '1', target_article: '4' }],
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'batch-002',
          articleNumbers: ['3'],
          status: 'pending',
          relations: [],
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(statsFor(current, 0.6)).toEqual({
      articles: 6,
      withCandidates: 4,
      batches: 2,
      imported: 1,
      relations: 2,
    });
  });
});
