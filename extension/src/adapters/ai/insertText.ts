/** Inserimento del testo nel composer di un provider.
 *
 *  `element.value = prompt` non basta: sia ChatGPT sia Gemini usano framework
 *  che ascoltano gli eventi sintetici e ignorerebbero la modifica diretta.
 *  `execCommand('insertText')` invece li fa scattare correttamente.
 *
 *  Questa funzione **non** invia mai il messaggio: nessun click sul pulsante
 *  di invio, nessun Enter sintetico. L'invio resta un'azione dell'utente.
 */

export interface InsertResult {
  ok: boolean;
  reason?: string;
}

export function findComposer(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) return element;
  }
  return null;
}

function readComposer(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.innerText ?? element.textContent ?? '';
}

function writeDirectly(element: HTMLElement, text: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = text;
    return;
  }
  element.innerText = text;
}

function looksInserted(actual: string, expected: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  const normalizedActual = normalize(actual);
  if (normalizedActual.length === 0) return false;

  const head = normalize(expected).slice(0, 80);
  return normalizedActual.includes(head);
}

export function insertTextIntoComposer(element: HTMLElement, text: string): InsertResult {
  try {
    let target = element;
    if (element.id === 'prompt-textarea' && element.tagName === 'DIV') {
      const p = element.querySelector('p');
      if (p) target = p as HTMLElement;
    }

    target.focus();

    let usedFallback = false;
    try {
      document.execCommand('selectAll', false);
      const inserted = document.execCommand('insertText', false, text);
      if (!inserted) throw new Error('execCommand ha restituito false');
    } catch {
      usedFallback = true;
      writeDirectly(target, text);
    }

    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));

    if (!looksInserted(readComposer(target), text)) {
      return {
        ok: false,
        reason: usedFallback
          ? "Il composer non ha accettato il testo nemmeno con l'inserimento diretto."
          : "Il testo non risulta presente nel composer dopo l'inserimento.",
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
