import { describe, expect, it } from 'vitest';
import { parseAiResponse } from '@/features/results/responseParser';

const RELATIONS = {
  relations: [
    {
      source_article: '2043',
      target_article: '2044',
      family: 'APPLICATION',
      evidence: 'salvo quanto previsto',
      confidence: 0.92,
    },
  ],
};

describe('parseAiResponse', () => {
  it('segnala una risposta vuota', () => {
    expect(parseAiResponse('').warning).toBe('La risposta è vuota.');
  });

  it('avverte quando la risposta è sospettosamente breve', () => {
    const parsed = parseAiResponse('{"relations":[]}');
    expect(parsed.warning).toContain('particolarmente breve');
  });

  it('estrae il JSON dal blocco di codice', () => {
    const raw = `Ecco l'analisi:\n\n\`\`\`json\n${JSON.stringify(RELATIONS, null, 2)}\n\`\`\`\n\nSpero sia utile.`;
    const parsed = parseAiResponse(raw);

    expect(parsed.warning).toBeUndefined();
    expect(parsed.relations).toHaveLength(1);
    expect(parsed.relations[0]?.source_article).toBe('2043');
    expect(parsed.relations[0]?.confidence).toBe(0.92);
  });

  it('estrae il primo oggetto JSON anche senza blocco di codice', () => {
    const raw = `Analisi completata. ${JSON.stringify(RELATIONS)} Fine della risposta.`;
    expect(parseAiResponse(raw).relations).toHaveLength(1);
  });

  it('non si fa ingannare dalle graffe dentro le stringhe', () => {
    const raw = JSON.stringify({
      relations: [{ source_article: '1', evidence: 'testo con } graffa' }],
    });
    const parsed = parseAiResponse(`Risposta: ${raw} — fine.`);
    expect(parsed.relations[0]?.evidence).toBe('testo con } graffa');
  });

  it('accetta le chiavi in italiano', () => {
    const raw = JSON.stringify({
      relazioni: [{ articolo_fonte: '7', articolo_target: '9', famiglia: 'DEROGA' }],
    });
    const parsed = parseAiResponse(raw);

    expect(parsed.relations[0]?.source_article).toBe('7');
    expect(parsed.relations[0]?.target_article).toBe('9');
    expect(parsed.relations[0]?.family).toBe('DEROGA');
  });

  it('conserva i campi non riconosciuti in extra', () => {
    const raw = JSON.stringify({
      relations: [{ source_article: '1', nota_del_modello: 'incerto' }],
    });
    expect(parseAiResponse(raw).relations[0]?.extra).toEqual({ nota_del_modello: 'incerto' });
  });

  it('avvisa se la risposta non è JSON valido', () => {
    const parsed = parseAiResponse('Il modello ha risposto solo con del testo discorsivo, senza JSON.');
    expect(parsed.relations).toHaveLength(0);
    expect(parsed.warning).toContain('interpretare la risposta come JSON');
  });

  it('tratta un elenco vuoto come esito legittimo', () => {
    const parsed = parseAiResponse(JSON.stringify({ relations: [], commento: 'nessun rinvio' }));
    expect(parsed.relations).toHaveLength(0);
    expect(parsed.warning).toContain('Nessuna relazione normativa');
  });

  it('accetta anche un array come radice', () => {
    const parsed = parseAiResponse(JSON.stringify(RELATIONS.relations));
    expect(parsed.relations).toHaveLength(1);
  });
});
