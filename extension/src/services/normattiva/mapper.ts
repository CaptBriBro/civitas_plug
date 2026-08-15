/** Confine fra la rappresentazione grezza di Normattiva e il dominio Civitas.
 *
 *  Il resto dell'estensione non conosce `caricaParams`, `idGruppo` o l'HTML:
 *  vede solo `LegalArticle`.
 */
import type { LegalArticle, ArticleVersion } from '@/domain/article';
import { analyzeArticle } from '@/parser/referenceParser';
import type { ArticleRef, ParsedVersion } from './types';

export interface MapArticleParams {
  jobId: string;
  urn: string;
  ref: ArticleRef;
  versions: Array<{ ref: ArticleRef['versions'][number]; parsed: ParsedVersion }>;
  threshold?: number;
}

export function toLegalArticle(params: MapArticleParams): LegalArticle {
  const versions: ArticleVersion[] = params.versions.map(({ ref, parsed }) => ({
    versionLabel: parsed.versionLabel || ref.versionLabel,
    versionOrder: ref.versionOrder,
    isCurrent: ref.isCurrent,
    vigenzaStart: parsed.vigenzaStart,
    vigenzaEnd: parsed.vigenzaEnd,
    rubrica: parsed.rubrica,
    testo: parsed.testo,
  }));

  const current = versions.find((v) => v.isCurrent) ?? versions[versions.length - 1];
  const testo = current?.testo ?? '';
  const analysis = analyzeArticle(testo, {
    threshold: params.threshold,
    ownNumero: params.ref.numero,
  });

  return {
    jobId: params.jobId,
    source: 'normattiva',
    urn: params.urn,
    numero: params.ref.numero,
    ordering: params.ref.ordering,
    rubrica: current?.rubrica ?? params.ref.rubrica,
    unitPath: params.ref.unitPath,
    testo,
    versions,
    fetchedAt: new Date().toISOString(),
    candidates: analysis.candidates,
    candidateScore: analysis.candidateScore,
  };
}

/** Il numero di articolo può essere `12-bis`: si estrae la parte numerica per
 *  filtrare sul range dichiarato dal job. */
export function numericPart(numero: string): number | null {
  const match = /^(\d+)/.exec(numero.trim());
  return match?.[1] ? Number(match[1]) : null;
}

export function isInRange(numero: string, start: number | null, end: number | null): boolean {
  if (start === null || end === null) return true;
  const value = numericPart(numero);
  return value !== null && value >= start && value <= end;
}
