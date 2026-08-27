/** Interpretazione della risposta AI incollata dall'utente.
 *
 *  Stessa cascata usata dal client CLI su Ollama: prima il blocco ```json,
 *  poi il primo oggetto JSON bilanciato, infine si conserva il testo grezzo
 *  senza perdere nulla.
 *
 *  Nessun `eval`, nessun `new Function`: solo `JSON.parse`.
 */
import type { ExtractedRelation } from '@/domain/workset';

export interface ParsedResponse {
  relations: ExtractedRelation[];
  /** Avviso non bloccante da mostrare all'utente prima del salvataggio. */
  warning?: string;
}

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)\s*```/i;

/** Estrae il primo valore JSON bilanciato, ignorando il testo attorno.
 *
 *  Considera sia gli oggetti sia gli array: un modello che risponde con un
 *  array puro non deve essere troncato al suo primo elemento. */
function firstJsonValue(text: string): string | null {
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');

  const candidates = [objectStart, arrayStart].filter((index) => index !== -1);
  if (candidates.length === 0) return null;

  const start = Math.min(...candidates);
  const open = text[start] === '[' ? '[' : '{';
  const close = open === '[' ? ']' : '}';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function normalizeRelation(raw: unknown): ExtractedRelation | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const asString = (key: string): string | undefined => {
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };

  // Estrae in modo robusto l'articolo sorgente
  let sourceArticle = asString('source_article') ?? asString('articolo_fonte');
  if (!sourceArticle && record['source'] && typeof record['source'] === 'object') {
    const sourceObj = record['source'] as Record<string, unknown>;
    sourceArticle = (typeof sourceObj['article'] === 'string' ? sourceObj['article'].trim() : undefined) ??
                    (typeof sourceObj['articolo'] === 'string' ? sourceObj['articolo'].trim() : undefined) ??
                    (typeof sourceObj['raw_text'] === 'string' ? sourceObj['raw_text'].trim() : undefined);
  }

  // Estrae in modo robusto l'articolo target, gestendo oggetti nidificati (come da schema target.raw_text o target.provision.article)
  let targetArticle = asString('target_article') ?? asString('articolo_target');
  if (!targetArticle && record['target'] && typeof record['target'] === 'object') {
    const targetObj = record['target'] as Record<string, unknown>;
    targetArticle = (typeof targetObj['raw_text'] === 'string' ? targetObj['raw_text'].trim() : undefined) ??
                    (typeof targetObj['article'] === 'string' ? targetObj['article'].trim() : undefined) ??
                    (typeof targetObj['articolo'] === 'string' ? targetObj['articolo'].trim() : undefined);

    if (!targetArticle && targetObj['provision'] && typeof targetObj['provision'] === 'object') {
      const provObj = targetObj['provision'] as Record<string, unknown>;
      targetArticle = (typeof provObj['article'] === 'string' ? provObj['article'].trim() : undefined) ??
                      (typeof provObj['articolo'] === 'string' ? provObj['articolo'].trim() : undefined);
    }
  }

  // Estrae in modo robusto il comma/paragrafo target
  const targetParagraph = asString('target_paragraph') ?? asString('target_paragraph_target') ?? asString('comma') ?? asString('paragrafo');

  // Estrae in modo robusto l'evidenza testuale
  const evidence = asString('evidence') ?? asString('evidenza') ?? asString('source_evidence');

  const relation: ExtractedRelation = {
    source_article: sourceArticle,
    target_article: targetArticle,
    target_paragraph: targetParagraph,
    family: asString('family') ?? asString('famiglia'),
    relation_type: asString('relation_type') ?? asString('tipo_relazione') ?? asString('type'),
    evidence: evidence,
    source_act: record['source_act'] && typeof record['source_act'] === 'object' ? (record['source_act'] as Record<string, unknown>) : undefined
  };

  const confidence = record['confidence'] ?? record['relation_confidence'];
  if (typeof confidence === 'number' && Number.isFinite(confidence)) {
    relation.confidence = confidence;
  }

  const known = new Set([
    'source_article', 'articolo_fonte', 'target_article', 'articolo_target',
    'target_paragraph', 'comma', 'paragrafo',
    'family', 'famiglia', 'relation_type', 'tipo_relazione', 'type',
    'evidence', 'evidenza', 'source_evidence', 'confidence', 'relation_confidence',
    'source_act'
  ]);
  const extra = Object.fromEntries(Object.entries(record).filter(([key]) => !known.has(key)));
  if (Object.keys(extra).length > 0) relation.extra = extra;

  const hasContent = Object.values(relation).some((value) => value !== undefined);
  return hasContent ? relation : null;
}

export const MIN_RESPONSE_LENGTH = 20;

export function parseAiResponse(raw: string): ParsedResponse {
  const text = (raw ?? '').trim();

  if (!text) return { relations: [], warning: 'La risposta è vuota.' };
  if (text.length < MIN_RESPONSE_LENGTH) {
    return {
      relations: [],
      warning: 'La risposta sembra particolarmente breve: verifica di averla copiata interamente.',
    };
  }

  const candidate = FENCE_RE.exec(text)?.[1] ?? firstJsonValue(text) ?? text;

  let payload: unknown;
  try {
    payload = JSON.parse(candidate);
  } catch {
    return {
      relations: [],
      warning:
        'Non è stato possibile interpretare la risposta come JSON. Il testo è stato conservato: verifica di aver copiato anche il blocco di codice.',
    };
  }

  const rawRelations = Array.isArray(payload)
    ? payload
    : ((payload as Record<string, unknown>)?.['relations'] ??
       (payload as Record<string, unknown>)?.['relazioni'] ??
       (payload as Record<string, unknown>)?.['references']);

  if (!Array.isArray(rawRelations)) {
    return {
      relations: [],
      warning:
        "La risposta non contiene un elenco 'relations'. Se il modello non ha individuato rinvii è corretto: puoi passare al batch successivo.",
    };
  }

  const relations = rawRelations
    .map(normalizeRelation)
    .filter((relation): relation is ExtractedRelation => relation !== null);

  if (relations.length === 0) {
    return { relations: [], warning: 'Nessuna relazione normativa individuata in questo batch.' };
  }

  return { relations };
}
