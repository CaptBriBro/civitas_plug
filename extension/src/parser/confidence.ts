/** Punteggio complessivo di un articolo e raccomandazione conseguente. */
import type { CandidateAnalysis, ReferenceCandidate } from '@/domain/candidate';

/** Sotto questa soglia l'articolo non viene proposto per l'analisi AI.
 *  Configurabile dall'utente nelle impostazioni. */
export const DEFAULT_THRESHOLD = 0.6;

/** Un match isolato e debole non basta; più famiglie diverse rinforzano il segnale. */
export function scoreFor(candidates: ReferenceCandidate[]): number {
  if (candidates.length === 0) return 0;

  const best = Math.max(...candidates.map((c) => c.confidence));
  const distinctLabels = new Set(candidates.map((c) => c.label)).size;
  const reinforcement = Math.min(0.08, (distinctLabels - 1) * 0.04);

  return Math.min(1, Number((best + reinforcement).toFixed(2)));
}

export function recommendationFor(score: number): CandidateAnalysis['recommendedAction'] {
  if (score >= 0.85) return 'HIGH_PROBABILITY';
  if (score >= 0.6) return 'MEDIUM_PROBABILITY';
  if (score >= 0.4) return 'LOW_PROBABILITY';
  return 'NO_RELATIONS';
}
