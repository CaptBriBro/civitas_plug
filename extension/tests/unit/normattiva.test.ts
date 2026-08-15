import { describe, expect, it } from 'vitest';
import { parseTree } from '@/services/normattiva/treeParser';
import { parseArticleHtml } from '@/services/normattiva/articleParser';
import { isInRange, numericPart, toLegalArticle } from '@/services/normattiva/mapper';
import {
  ARTICLE_HTML,
  ARTICLE_HTML_FALLBACK_SELECTOR,
  TREE_HTML,
} from '../fixtures/normattiva';

describe('parseTree', () => {
  const tree = parseTree(TREE_HTML);

  it('estrae le unità strutturali con la gerarchia', () => {
    expect(tree.units.map((u) => u.unitType)).toEqual(['libro', 'titolo']);
    expect(tree.units[0]?.heading).toBe('Delle obbligazioni');
    // Il titolo è annidato nel libro
    expect(tree.units[1]?.path).toEqual(['LIBRO QUARTO']);
  });

  it('estrae gli articoli con il percorso strutturale', () => {
    expect(tree.articles.map((a) => a.numero)).toEqual(['2043', '2044']);
    expect(tree.articles[0]?.unitPath).toEqual(['LIBRO QUARTO', 'TITOLO IX']);
    expect(tree.articles[0]?.normattivaArticleId).toBe('2043');
    expect(tree.articles[0]?.gruppo).toBe('77');
  });

  it('riconosce le versioni storiche e marca come vigente la più recente', () => {
    const versions = tree.articles[0]!.versions;
    expect(versions.map((v) => v.versionLabel)).toEqual(['orig.', 'agg.1']);
    expect(versions.find((v) => v.isCurrent)?.versionLabel).toBe('agg.1');
  });

  it('lascia vigente l\'originale se non esistono versioni successive', () => {
    const versions = tree.articles[1]!.versions;
    expect(versions).toHaveLength(1);
    expect(versions[0]?.isCurrent).toBe(true);
  });
});

describe('parseArticleHtml', () => {
  it('estrae testo, rubrica e finestra di vigenza', () => {
    const parsed = parseArticleHtml(ARTICLE_HTML, 'agg.1', 1);

    expect(parsed.rubrica).toBe('Risarcimento per fatto illecito');
    expect(parsed.testo).toContain('danno ingiusto');
    expect(parsed.vigenzaStart).toBe('1942-03-16');
    expect(parsed.vigenzaEnd).toBe('2020-12-31');
    expect(parsed.versionLabel).toBe('agg.1');
  });

  it('rimuove le voci di navigazione', () => {
    const parsed = parseArticleHtml(ARTICLE_HTML);
    expect(parsed.testo).not.toContain('Articolo successivo');
    expect(parsed.testo).not.toContain('Articolo precedente');
  });

  it('ricade sui selettori alternativi quando manca testoNormalizzato', () => {
    const parsed = parseArticleHtml(ARTICLE_HTML_FALLBACK_SELECTOR);
    expect(parsed.rubrica).toBe('Legittima difesa');
    expect(parsed.testo).toContain('legittima difesa');
  });
});

describe('mapper', () => {
  it('estrae la parte numerica dei numeri di articolo', () => {
    expect(numericPart('2043')).toBe(2043);
    expect(numericPart('12-bis')).toBe(12);
    expect(numericPart('non-numerico')).toBeNull();
  });

  it('filtra sul range dichiarato dal job', () => {
    expect(isInRange('2043', 1173, 2059)).toBe(true);
    expect(isInRange('455', 1173, 2059)).toBe(false);
    // Senza range dichiarato non si scarta nulla
    expect(isInRange('455', null, null)).toBe(true);
  });

  it('produce un LegalArticle con i candidati già calcolati', () => {
    const tree = parseTree(TREE_HTML);
    const parsed = parseArticleHtml(ARTICLE_HTML, 'orig.', 0);

    const article = toLegalArticle({
      jobId: 'task-cc-lib4',
      urn: 'urn:nir:stato:regio.decreto:1942-03-16;262',
      ref: tree.articles[0]!,
      versions: [{ ref: tree.articles[0]!.versions[0]!, parsed }],
    });

    expect(article.numero).toBe('2043');
    expect(article.rubrica).toBe('Risarcimento per fatto illecito');
    expect(article.unitPath).toEqual(['LIBRO QUARTO', 'TITOLO IX']);
    expect(article.source).toBe('normattiva');
    expect(article.candidateScore).toBeGreaterThanOrEqual(0);
  });
});
