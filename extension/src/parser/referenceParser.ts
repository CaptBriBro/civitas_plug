/** Screening locale e deterministico dei rinvii normativi.
 *
 *  Nessun LLM viene coinvolto per decidere se un testo *possa* contenere
 *  riferimenti: sarebbe uno spreco e renderebbe il risultato non riproducibile.
 *  Il modello interviene dopo, solo sugli articoli che superano la soglia.
 */
import type {
  CandidateAnalysis,
  ParsedReference,
  ReferenceCandidate,
} from '@/domain/candidate';
import {
  CANDIDATE_PATTERNS,
  FALSE_POSITIVE_EXCLUSIONS,
  PARSED_REFERENCE_PATTERNS,
} from './patterns';
import { normalize, snippetAround } from './normalization';
import { DEFAULT_THRESHOLD, recommendationFor, scoreFor } from './confidence';

const EMPTY_ANALYSIS: CandidateAnalysis = {
  candidateScore: 0,
  hasCandidates: false,
  matchedLabels: [],
  candidates: [],
  recommendedAction: 'NO_RELATIONS',
};

function isFalsePositive(snippet: string): boolean {
  return FALSE_POSITIVE_EXCLUSIONS.some((pattern) => pattern.test(snippet));
}

function normalizeArticleNumber(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Un articolo apre sempre col proprio numero come intestazione
 *  ("Art. 17. (Rubrica) ..."): senza questo controllo verrebbe letto come un
 *  rinvio a se stesso invece che come la propria etichetta. */
function isSelfReference(candidate: ReferenceCandidate, ownNumero?: string): boolean {
  if (!ownNumero || !candidate.parsed?.article) return false;
  return normalizeArticleNumber(candidate.parsed.article) === normalizeArticleNumber(ownNumero);
}

function parseReference(snippet: string): ParsedReference | undefined {
  const parsed: ParsedReference = {};

  const article = PARSED_REFERENCE_PATTERNS.article.exec(snippet);
  if (article?.[1]) parsed.article = article[1].replace(/\s+/g, '-').toLowerCase();

  const lawType = PARSED_REFERENCE_PATTERNS.lawType.exec(snippet);
  if (lawType?.[1]) parsed.lawType = lawType[1].toUpperCase().replace(/\s+/g, ' ');

  const numberYear = PARSED_REFERENCE_PATTERNS.lawNumberYear.exec(snippet);
  if (numberYear) {
    const number = numberYear[1] ?? numberYear[3];
    const year = numberYear[2] ?? numberYear[4];
    if (number) parsed.lawNumber = number;
    if (year) parsed.lawYear = Number(year);
  }

  if (parsed.lawYear === undefined) {
    const year = PARSED_REFERENCE_PATTERNS.year.exec(snippet);
    if (year?.[1]) parsed.lawYear = Number(year[1]);
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

/** Fonde i candidati sovrapposti tenendo quello con confidenza più alta. */
function mergeOverlapping(candidates: ReferenceCandidate[]): ReferenceCandidate[] {
  const sorted = [...candidates].sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: ReferenceCandidate[] = [];

  for (const candidate of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && candidate.start < previous.end) {
      if (candidate.confidence > previous.confidence) {
        merged[merged.length - 1] = { ...candidate, start: previous.start };
      }
      continue;
    }
    merged.push(candidate);
  }

  return merged;
}

export interface ParseOptions {
  threshold?: number;
  maxCandidates?: number;
  /** Numero del proprio articolo, per scartare l'auto-citazione della
   *  propria intestazione ("Art. N. (Rubrica)") come se fosse un rinvio. */
  ownNumero?: string;
}

export function analyzeArticle(rawText: string, options: ParseOptions = {}): CandidateAnalysis {
  if (!rawText || !rawText.trim()) return { ...EMPTY_ANALYSIS };

  const { text } = normalize(rawText);
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const found: ReferenceCandidate[] = [];

  for (const pattern of CANDIDATE_PATTERNS) {
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const snippet = snippetAround(text, start, end);

      if (isFalsePositive(snippet)) continue;

      const candidate: ReferenceCandidate = {
        id: `${pattern.type}-${start}-${end}`,
        text: snippet,
        start,
        end,
        confidence: pattern.score,
        type: pattern.type,
        label: pattern.label,
        parsed: parseReference(snippet),
      };

      if (isSelfReference(candidate, options.ownNumero)) continue;

      found.push(candidate);

      // Un pattern a lunghezza nulla bloccherebbe il ciclo.
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
    }
  }

  if (found.length === 0) return { ...EMPTY_ANALYSIS };

  let candidates = mergeOverlapping(found).sort((a, b) => b.confidence - a.confidence);
  if (options.maxCandidates) candidates = candidates.slice(0, options.maxCandidates);

  const candidateScore = scoreFor(candidates);

  return {
    candidateScore,
    hasCandidates: candidateScore >= threshold,
    matchedLabels: [...new Set(candidates.map((c) => c.label))],
    candidates,
    recommendedAction: recommendationFor(candidateScore),
  };
}
