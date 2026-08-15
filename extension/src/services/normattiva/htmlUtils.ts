/** Utility per leggere HTML come stringa, senza `DOMParser`.
 *
 *  Un service worker MV3 non ha un DOM (niente `document`, niente
 *  `DOMParser`): l'acquisizione da Normattiva deve poter girare lì per non
 *  dipendere dalla visibilità di una scheda, che Chrome rallenta o sospende
 *  quando non è a fuoco. Queste funzioni replicano solo il sottoinsieme di
 *  comportamento DOM che serve ai parser di Normattiva.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  agrave: 'à',
  Agrave: 'À',
  egrave: 'è',
  Egrave: 'È',
  eacute: 'é',
  Eacute: 'É',
  igrave: 'ì',
  Igrave: 'Ì',
  ograve: 'ò',
  Ograve: 'Ò',
  ugrave: 'ù',
  Ugrave: 'Ù',
};

/** Decodifica le entità HTML più comuni nei testi normativi italiani. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

/** Rimuove i tag e decodifica le entità: equivalente a `element.textContent`
 *  per l'HTML di Normattiva (che usa spazi/a-capo reali nel markup, non
 *  `<br>` come unico separatore di riga). */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ''));
}

export interface HtmlBlock {
  /** Indice del carattere `<` dell'apertura, per ordinare i blocchi come nel documento. */
  start: number;
  /** Contenuto grezzo dell'attributo `class`/`id`, per filtri aggiuntivi. */
  openTag: string;
  content: string;
  end: number;
}

/** Trova ogni occorrenza di `<tagName ... class="...token..." ...>` (o
 *  `id="token"`) e ne restituisce il contenuto interno, gestendo tag annidati
 *  dello stesso nome tramite conteggio di profondità — un semplice regex non
 *  greedy si fermerebbe al primo `</div>` interno, non a quello che chiude
 *  davvero il blocco cercato. */
export function findAllByClassOrId(
  html: string,
  tagName: string,
  token: string,
  attr: 'class' | 'id' = 'class',
): HtmlBlock[] {
  const attrPattern =
    attr === 'class'
      ? new RegExp(`class="[^"]*\\b${token}\\b[^"]*"`, 'i')
      : new RegExp(`id="${token}"`, 'i');

  const openTagRe = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  const blocks: HtmlBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = openTagRe.exec(html)) !== null) {
    if (!attrPattern.test(match[0])) continue;

    const bodyStart = match.index + match[0].length;
    const closed = findMatchingClose(html, tagName, bodyStart);
    if (!closed) continue;

    blocks.push({
      start: match.index,
      openTag: match[0],
      content: html.slice(bodyStart, closed.start),
      end: closed.end,
    });
    openTagRe.lastIndex = closed.end;
  }

  return blocks;
}

export function findByClassOrId(
  html: string,
  tagName: string,
  token: string,
  attr: 'class' | 'id' = 'class',
): { content: string; end: number } | null {
  return findAllByClassOrId(html, tagName, token, attr)[0] ?? null;
}

/** Scandisce in avanti da `fromIndex` contando aperture/chiusure dello stesso
 *  tag per trovare il `</tagName>` che chiude davvero il blocco. */
function findMatchingClose(
  html: string,
  tagName: string,
  fromIndex: number,
): { start: number; end: number } | null {
  const tagRe = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'gi');
  tagRe.lastIndex = fromIndex;

  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const isClosing = match[1] === '/';
    depth += isClosing ? -1 : 1;

    if (depth === 0) {
      return { start: match.index, end: match.index + match[0].length };
    }
  }

  return null;
}
