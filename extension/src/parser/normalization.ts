/** Normalizzazione del testo prima del riconoscimento dei pattern. */

/** Comprime gli spazi mantenendo però le posizioni utilizzabili per gli offset:
 *  restituisce il testo normalizzato e la mappa verso gli indici originali. */
export interface NormalizedText {
  text: string;
  /** `map[i]` è l'indice nel testo originale del carattere `text[i]`. */
  map: number[];
}

export function normalize(raw: string): NormalizedText {
  const chars: string[] = [];
  const map: number[] = [];
  let previousWasSpace = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i]!;
    const isSpace = /\s/.test(char);

    if (isSpace) {
      if (previousWasSpace) continue;
      chars.push(' ');
      map.push(i);
      previousWasSpace = true;
      continue;
    }

    // Le virgolette tipografiche spezzano i pattern: si uniformano.
    const normalizedChar = char.replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"');
    chars.push(normalizedChar);
    map.push(i);
    previousWasSpace = false;
  }

  return { text: chars.join('').trim(), map };
}

/** Frammento con un po' di contesto attorno al match, per mostrarlo nella UI. */
export function snippetAround(text: string, start: number, end: number, padding = 30): string {
  const from = Math.max(0, start - padding);
  const to = Math.min(text.length, end + padding);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < text.length ? '…' : '';
  return `${prefix}${text.slice(from, to).trim()}${suffix}`;
}
