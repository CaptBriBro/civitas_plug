/** Parser del testo di un articolo.
 *
 *  Port di `civitas_cli/backend/engine_downloader/article_parser.py`, senza
 *  `DOMParser`: gira nel service worker (vedi `treeParser.ts` per il perché).
 *  Il layout di Normattiva non è uniforme fra atti e versioni: si prova una
 *  cascata di selettori, dal più specifico al fallback sull'intero body.
 */
import { findByClassOrId, stripTags } from './htmlUtils';
import type { ParsedVersion } from './types';

// Nel template AKN attuale di Normattiva, #testoNormalizzato è un
// contenitore che avvolge ANCHE la barra di navigazione (articolo
// precedente/successivo), il riquadro di vigenza e l'etichetta di versione
// ("orig."/"agg. N") come fratelli del contenuto vero: prendere il suo intero
// testo inquina sia il testo sia l'estrazione della rubrica. I contenitori
// più interni (attachment-just-text, bodyTesto) hanno invece solo il
// contenuto normativo, quindi vanno tentati per primi.
const BODY_SELECTORS: Array<{ tag: string; attr: 'class' | 'id'; token: string }> = [
  { tag: 'span', attr: 'class', token: 'attachment-just-text' },
  { tag: 'div', attr: 'class', token: 'bodyTesto' },
  { tag: 'div', attr: 'id', token: 'testoNormalizzato' },
  { tag: 'span', attr: 'class', token: 'art-testo' },
  { tag: 'div', attr: 'class', token: 'testo-articolo' },
  { tag: 'div', attr: 'class', token: 'articolo' },
  { tag: 'div', attr: 'class', token: 'art_testo' },
  { tag: 'div', attr: 'class', token: 'texthtml' },
];

const RUBRICA_RE = /\(([^)]{3,200})\)/;
const NAV_NOISE = ['articolo successivo', 'articolo precedente'];

function clean(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Normattiva usa il formato italiano gg-mm-aaaa; si restituisce ISO. */
function parseItalianDate(value: string): string | null {
  const match = /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(value.trim());
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  }
  const iso = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function extractText(html: string): string {
  for (const { tag, attr, token } of BODY_SELECTORS) {
    const block = findByClassOrId(html, tag, token, attr);
    if (block) return clean(stripTags(block.content));
  }
  return clean(stripTags(html));
}

export function parseArticleHtml(
  html: string,
  versionLabel = 'orig.',
  _versionOrder = 0,
): ParsedVersion {
  const testo = extractText(html)
    .split('\n')
    .filter((line) => !NAV_NOISE.some((noise) => line.toLowerCase().includes(noise)))
    .join('\n')
    .trim();

  let vigenzaStart: string | null = null;
  let vigenzaEnd: string | null = null;

  const vigore = findByClassOrId(html, 'div', 'vigore');
  if (vigore) {
    const text = stripTags(vigore.content);
    const start = /dal:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/.exec(text);
    const end = /\bal:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/.exec(text);
    if (start?.[1]) vigenzaStart = parseItalianDate(start[1]);
    if (end?.[1]) vigenzaEnd = parseItalianDate(end[1]);
  }

  // La rubrica è fra parentesi in apertura di articolo.
  const rubrica = RUBRICA_RE.exec(testo.slice(0, 400))?.[1]?.trim() ?? null;

  return { versionLabel, vigenzaStart, vigenzaEnd, rubrica, testo };
}
