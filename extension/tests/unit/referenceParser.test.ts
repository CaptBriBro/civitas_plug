import { describe, expect, it } from 'vitest';
import { analyzeArticle } from '@/parser/referenceParser';
import { DEFAULT_THRESHOLD } from '@/parser/confidence';
import { CORPUS } from '../fixtures/corpus';

describe('analyzeArticle', () => {
  it('non produce candidati su testo vuoto', () => {
    const analysis = analyzeArticle('   ');
    expect(analysis.hasCandidates).toBe(false);
    expect(analysis.candidates).toHaveLength(0);
    expect(analysis.recommendedAction).toBe('NO_RELATIONS');
  });

  it('riconosce un rinvio esplicito con legge, numero e anno', () => {
    const analysis = analyzeArticle(
      "Ai sensi dell'articolo 3 della legge 7 agosto 1990, n. 241, il provvedimento è motivato.",
    );

    expect(analysis.hasCandidates).toBe(true);
    expect(analysis.candidateScore).toBeGreaterThanOrEqual(0.75);

    const parsed = analysis.candidates.map((c) => c.parsed).filter(Boolean);
    expect(parsed.some((p) => p?.lawYear === 1990)).toBe(true);
  });

  it('assegna il punteggio massimo alle abrogazioni', () => {
    const analysis = analyzeArticle('Sono abrogati gli articoli da 12 a 18 del regio decreto.');
    expect(analysis.candidateScore).toBeGreaterThanOrEqual(0.95);
    expect(analysis.recommendedAction).toBe('HIGH_PROBABILITY');
  });

  it('esclude i falsi positivi noti', () => {
    const analysis = analyzeArticle(
      'È punito con la reclusione, salvo che il fatto costituisca più grave reato.',
    );
    expect(analysis.hasCandidates).toBe(false);
  });

  it('riconosce le forme abbreviate dei codici', () => {
    const analysis = analyzeArticle("Si applica l'art. 2043 c.c. in materia di fatto illecito.");
    expect(analysis.hasCandidates).toBe(true);
    expect(analysis.matchedLabels).toContain('Rinvio a codice');
  });

  it('non restituisce candidati sovrapposti', () => {
    const analysis = analyzeArticle(
      "Ai sensi dell'articolo 3 della legge 241/1990 e dell'articolo 7 del medesimo atto.",
    );
    const sorted = [...analysis.candidates].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]!.start).toBeGreaterThanOrEqual(sorted[i - 1]!.end);
    }
  });

  it('rispetta la soglia configurata', () => {
    const text = 'Il comma 2 stabilisce il termine.';
    expect(analyzeArticle(text, { threshold: 0.95 }).hasCandidates).toBe(false);
    expect(analyzeArticle(text, { threshold: 0.3 }).hasCandidates).toBe(true);
  });

  it("non scambia l'intestazione dell'articolo per un rinvio a se stesso", () => {
    // Il testo estratto da Normattiva inizia sempre con la propria etichetta,
    // es. "Art. 17. (Acquisto di immobili e accessioni)": senza il filtro
    // sull'auto-citazione verrebbe letta come "Menzione articolo" a se stessa.
    const text = 'Art. 17. (Acquisto di immobili e accessioni). Il tutore non può acquistare beni del minore.';

    const withoutOwnNumero = analyzeArticle(text, { threshold: 0 });
    expect(withoutOwnNumero.candidates.some((c) => c.parsed?.article === '17')).toBe(true);

    const withOwnNumero = analyzeArticle(text, { threshold: 0, ownNumero: '17' });
    expect(withOwnNumero.candidates.some((c) => c.parsed?.article === '17')).toBe(false);
  });

  it('continua a riconoscere un rinvio a un articolo diverso da sé', () => {
    const text = 'Art. 17. Si applica quanto previsto dall\'articolo 18 del presente codice.';
    const analysis = analyzeArticle(text, { threshold: 0, ownNumero: '17' });

    expect(analysis.candidates.some((c) => c.parsed?.article === '18')).toBe(true);
    expect(analysis.candidates.some((c) => c.parsed?.article === '17')).toBe(false);
  });
});

describe('metriche sul corpus', () => {
  it('privilegia il recall: nessun rinvio reale viene perso', () => {
    const positives = CORPUS.filter((entry) => entry.expected);
    const missed = positives.filter(
      (entry) => !analyzeArticle(entry.input, { threshold: DEFAULT_THRESHOLD }).hasCandidates,
    );

    expect(missed.map((entry) => entry.note)).toEqual([]);
  });

  it('mantiene la precisione sopra l\'80%', () => {
    let truePositive = 0;
    let falsePositive = 0;

    for (const entry of CORPUS) {
      const detected = analyzeArticle(entry.input, { threshold: DEFAULT_THRESHOLD }).hasCandidates;
      if (detected && entry.expected) truePositive += 1;
      if (detected && !entry.expected) falsePositive += 1;
    }

    const precision = truePositive / (truePositive + falsePositive);
    expect(precision).toBeGreaterThan(0.8);
  });
});
