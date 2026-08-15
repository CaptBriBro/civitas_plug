/** Regressione contro HTML reale scaricato da Normattiva (Codice Civile,
 *  042U0262), a garanzia che il parser resti allineato al template AKN
 *  attuale del sito. I fixture sono snapshot statici: non fanno rete. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseTree } from '@/services/normattiva/treeParser';
import { parseArticleHtml } from '@/services/normattiva/articleParser';

function fixture(name: string): string {
  return readFileSync(path.resolve(__dirname, `../fixtures/${name}`), 'utf-8');
}

describe('parseTree su HTML reale', () => {
  const { articles } = parseTree(fixture('real-tree-cc.html'));

  it('esclude le clausole di enatta del decreto (etichette numeriche nude)', () => {
    // Il decreto che approva il Codice Civile porta due voci "1"/"2" senza
    // prefisso "art.": non sono testo codificato e collidono con il vero
    // art. 1/2 se non vengono escluse.
    expect(articles.filter((a) => a.gruppo === '0')).toHaveLength(0);
  });

  it('include solo articoli con etichetta "art. N"', () => {
    expect(articles.length).toBeGreaterThan(3000);
    expect(articles.every((a) => /^\d/.test(a.numero))).toBe(true);
  });

  it('il primo articolo reale è il Preleggi art. 1, non la clausola del decreto', () => {
    expect(articles[0]?.numero).toBe('1');
    expect(articles[0]?.gruppo).toBe('1');
  });
});

describe('parseArticleHtml su HTML reale', () => {
  it('estrae testo pulito da un articolo reale, senza rumore di navigazione', () => {
    const parsed = parseArticleHtml(fixture('real-article-preleggi1.html'), 'orig.', 0);

    expect(parsed.rubrica).toBe('Indicazione delle fonti');
    expect(parsed.testo).toContain('Sono fonti del diritto');
    expect(parsed.testo).not.toContain('articolo successivo');
    expect(parsed.testo).not.toContain('articolo precedente');
    expect(parsed.testo).not.toContain('Testo in vigore dal');
  });

  it("non confonde l'etichetta di versione con la rubrica", () => {
    // Prima della correzione, "(orig.)" veniva letta come rubrica perché il
    // blocco di vigenza precede il testo vero dentro #testoNormalizzato.
    const parsed = parseArticleHtml(fixture('real-article-decree1.html'), 'orig.', 0);
    expect(parsed.rubrica).not.toBe('orig.');
  });

  it('estrae comunque il preambolo del decreto quando è l\'unico contenuto', () => {
    const parsed = parseArticleHtml(fixture('real-article-decree1.html'), 'orig.', 0);
    expect(parsed.testo).toContain('approvato il testo del Codice civile');
  });
});
