/** Parser dell'albero multivigenza di Normattiva.
 *
 *  Port di `civitas_cli/backend/engine_downloader/tree_parser.py`, senza
 *  `DOMParser`: gira nel service worker, così l'acquisizione non dipende
 *  dalla visibilità di una scheda (che Chrome rallenta o sospende quando non
 *  è a fuoco). `findAllByClassOrId` sostituisce `querySelectorAll` gestendo
 *  comunque i tag annidati tramite conteggio di profondità.
 */
import { findAllByClassOrId, stripTags } from './htmlUtils';
import type { ArticleRef, UnitRef, VersionRef } from './types';

const UNIT_RANK: Record<string, number> = {
  parte: 0,
  libro: 1,
  titolo: 2,
  capo: 3,
  sezione: 4,
  paragrafo: 5,
};

const UNIT_KEYWORDS = /^\s*(PARTE|LIBRO|TITOLO|CAPO|SEZIONE|Paragrafo)\b/i;
const VERSION_LABEL = /^\s*(orig\.?|agg\.?\s*\d+|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s*$/i;
// Le disposizioni vere hanno sempre l'etichetta "art. N": un atto approvato
// da un decreto (es. il Codice Civile) porta anche 1-2 voci con etichetta
// numerica nuda ("1", "2"), che sono le clausole di enatta del decreto
// stesso, non articoli del testo codificato. Vanno escluse, altrimenti il
// loro "numero" collide con il vero art. 1/2 del testo.
const REAL_ARTICLE_LABEL = /^art\.?\s*\d/i;
const CARICA_RE = /\/atto\/caricaArticolo\?[^'"]*/;
const ID_ARTICOLO_RE = /art\.idArticolo=(\d+)/;
const ID_GRUPPO_RE = /art\.idGruppo=(\d+)/;

function clean(text: string | null | undefined): string {
  return stripTags(text ?? '').replace(/\s+/g, ' ').trim();
}

function extractCaricaParams(anchorOpenTagAndContent: string): string | null {
  const match = CARICA_RE.exec(anchorOpenTagAndContent);
  if (!match) return null;
  return match[0].split('/atto/caricaArticolo?')[1]?.replace(/&+$/, '') ?? null;
}

function isVersionLabel(label: string): boolean {
  return VERSION_LABEL.test(label.trim());
}

/** `orig.` viene per prima, poi `agg. 1`, `agg. 2`, … */
function versionOrder(label: string): number {
  const normalized = label.trim().toLowerCase();
  if (normalized.startsWith('orig')) return 0;
  const match = /agg\.?\s*(\d+)/.exec(normalized);
  return match?.[1] ? Number(match[1]) : 999;
}

/** Le intestazioni di unità arrivano come blocco HTML con <br>: si ricostruiscono
 *  le righe e si accoppia ogni etichetta con la sua rubrica. */
function parseHeaderUnits(html: string): Array<[string, string, string | null]> {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|a|span|p)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const lines = text
    .split('\n')
    .map((line) => clean(line))
    .filter(Boolean);

  const units: Array<[string, string, string | null]> = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (UNIT_KEYWORDS.test(line)) {
      const unitType = line.split(/\s+/)[0]!.toLowerCase();
      let heading: string | null = null;
      const next = lines[i + 1];
      if (next && !UNIT_KEYWORDS.test(next)) {
        heading = next;
        i += 1;
      }
      units.push([unitType, line, heading]);
    }
    i += 1;
  }

  return units;
}

export interface ParsedTree {
  units: UnitRef[];
  articles: ArticleRef[];
}

interface ScanEntry {
  start: number;
  end: number;
  kind: 'unit' | 'article';
  /** Contenuto interno per i blocchi `unit`. */
  content?: string;
  /** Tag di apertura + contenuto per i blocchi `article` (serve a `extractCaricaParams`). */
  raw?: string;
}

export function parseTree(html: string): ParsedTree {
  // L'albero multivigenza vive dentro #albero quando presente; altrimenti si
  // scansiona l'intero documento (alcuni atti minori non hanno il wrapper).
  const albero = findAllByClassOrId(html, 'div', 'albero', 'id')[0];
  const scope = albero ? albero.content : html;

  const unitBlocks = findAllByClassOrId(scope, 'div', 'collapse-div');
  const anchorEntries = findAnchors(scope, 'numero_articolo');

  const entries: ScanEntry[] = [
    ...unitBlocks.map((b): ScanEntry => ({ start: b.start, end: b.end, kind: 'unit', content: b.content })),
    ...anchorEntries.map((a): ScanEntry => ({ start: a.start, end: a.end, kind: 'article', raw: a.raw })),
  ].sort((a, b) => a.start - b.start);

  const breadcrumb = new Map<number, UnitRef>();
  const units: UnitRef[] = [];
  const articles: ArticleRef[] = [];
  let ordering = 0;
  let current: ArticleRef | null = null;

  const pathFromBreadcrumb = (): string[] =>
    [...breadcrumb.keys()].sort((a, b) => a - b).map((rank) => breadcrumb.get(rank)!.label);

  for (const entry of entries) {
    if (entry.kind === 'unit') {
      for (const [unitType, label, heading] of parseHeaderUnits(entry.content ?? '')) {
        const rank = UNIT_RANK[unitType] ?? 9;
        for (const existingRank of [...breadcrumb.keys()]) {
          if (existingRank >= rank) breadcrumb.delete(existingRank);
        }

        const unit: UnitRef = {
          unitType,
          label,
          heading,
          ordering: units.length,
          path: pathFromBreadcrumb(),
        };
        breadcrumb.set(rank, unit);
        units.push(unit);
      }
      continue;
    }

    const raw = entry.raw ?? '';
    const params = extractCaricaParams(raw);
    if (!params) continue;

    const label = clean(raw.replace(/^<a\b[^>]*>/i, '').replace(/<\/a>$/i, ''));
    if (!label) continue;

    // Le versioni storiche sono ancore figlie con etichetta `orig.`/`agg. N`.
    if (isVersionLabel(label) && current) {
      current.versions.push({
        versionLabel: label.toLowerCase().replace(/\s+/g, ''),
        versionOrder: versionOrder(label),
        caricaParams: params,
        isCurrent: false,
      });
      continue;
    }

    if (!REAL_ARTICLE_LABEL.test(label)) continue;

    ordering += 1;
    current = {
      numero: label.replace(/^art\.?\s*/i, '').trim(),
      ordering,
      normattivaArticleId: ID_ARTICOLO_RE.exec(params)?.[1] ?? null,
      gruppo: ID_GRUPPO_RE.exec(params)?.[1] ?? null,
      rubrica: null,
      unitPath: pathFromBreadcrumb(),
      versions: [{ versionLabel: 'orig.', versionOrder: 0, caricaParams: params, isCurrent: true }],
    };
    articles.push(current);
  }

  finalizeVersions(articles);
  return { units, articles };
}

/** Le ancore non annidano altre ancore: un match non greedy fino a `</a>` è sicuro. */
function findAnchors(html: string, classToken: string): Array<{ start: number; end: number; raw: string }> {
  const anchorRe = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  const classPattern = new RegExp(`class="[^"]*\\b${classToken}\\b[^"]*"`, 'i');
  const results: Array<{ start: number; end: number; raw: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    if (!classPattern.test(match[0])) continue;
    results.push({ start: match.index, end: match.index + match[0].length, raw: match[0] });
  }

  return results;
}

/** Se esistono versioni storiche, la vigente è l'ultima e non più l'originale. */
function finalizeVersions(articles: ArticleRef[]): void {
  for (const article of articles) {
    const historical: VersionRef[] = article.versions.filter((v) => !v.isCurrent);
    if (historical.length === 0) continue;

    historical.sort((a, b) => a.versionOrder - b.versionOrder);
    historical[historical.length - 1]!.isCurrent = true;
    article.versions = historical;
  }
}
