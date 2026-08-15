/** Test degli adapter contro fixture DOM, senza dipendere dai siti live. */
import { beforeEach, describe, expect, it } from 'vitest';
import { providerRegistry, getAdapter, adapterForUrl } from '@/adapters/ai/registry';
import { findComposer, insertTextIntoComposer } from '@/adapters/ai/insertText';
import { SELECTORS } from '@/adapters/ai/selectors';

const PROMPT = 'Sei un estrattore di relazioni normative. Analizza il seguente articolo.';

describe('registry', () => {
  it('espone entrambi i provider', () => {
    expect(Object.keys(providerRegistry).sort()).toEqual(['chatgpt', 'gemini']);
  });

  it('riconosce gli URL supportati', () => {
    expect(getAdapter('chatgpt').isSupportedUrl('https://chatgpt.com/c/abc')).toBe(true);
    expect(getAdapter('chatgpt').isSupportedUrl('https://gemini.google.com/app')).toBe(false);
    expect(adapterForUrl('https://gemini.google.com/app')?.id).toBe('gemini');
    expect(adapterForUrl('https://example.com')).toBeUndefined();
  });

  it('non espone alcuna funzione di lettura delle risposte', () => {
    for (const adapter of Object.values(providerRegistry)) {
      const surface = Object.keys(adapter);
      expect(surface).toEqual(
        expect.arrayContaining(['id', 'label', 'getUrl', 'isSupportedUrl', 'detectConversationState', 'insertPrompt']),
      );
      expect(surface).not.toContain('getLastResponse');
      expect(surface).not.toContain('waitForResponse');
      expect(surface).not.toContain('observeResponse');
    }
  });
});

describe('inserimento nel composer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('trova il composer di ChatGPT', () => {
    document.body.innerHTML = '<div id="prompt-textarea" contenteditable="true"></div>';
    expect(findComposer(SELECTORS.chatgpt.composer)).not.toBeNull();
  });

  it('trova il composer di Gemini', () => {
    document.body.innerHTML = '<div class="ql-editor" contenteditable="true"></div>';
    expect(findComposer(SELECTORS.gemini.composer)).not.toBeNull();
  });

  it('restituisce null quando il layout è sconosciuto', () => {
    document.body.innerHTML = '<div class="qualcosa-di-nuovo"></div>';
    expect(findComposer(SELECTORS.chatgpt.composer)).toBeNull();
  });

  it('inserisce il testo in una textarea e notifica il framework', () => {
    document.body.innerHTML = '<textarea data-id="composer"></textarea>';
    const composer = document.querySelector('textarea')!;

    const events: string[] = [];
    composer.addEventListener('input', () => events.push('input'));
    composer.addEventListener('change', () => events.push('change'));

    const result = insertTextIntoComposer(composer, PROMPT);

    expect(result.ok).toBe(true);
    expect(composer.value).toBe(PROMPT);
    expect(events).toEqual(['input', 'change']);
  });

  it('inserisce il testo in un contenteditable', () => {
    document.body.innerHTML = '<div id="prompt-textarea" contenteditable="true"></div>';
    const composer = document.getElementById('prompt-textarea')!;

    expect(insertTextIntoComposer(composer, PROMPT).ok).toBe(true);
    expect(composer.innerText).toContain('estrattore di relazioni');
  });

  it('non invia mai il prompt', () => {
    document.body.innerHTML = `
      <textarea data-id="composer"></textarea>
      <button data-testid="send-button">Invia</button>
    `;
    const composer = document.querySelector('textarea')!;

    let submitted = false;
    document.querySelector('button')!.addEventListener('click', () => (submitted = true));

    insertTextIntoComposer(composer, PROMPT);

    expect(submitted).toBe(false);
  });

  it('segnala il fallimento quando il composer rifiuta il testo', () => {
    document.body.innerHTML = '<div id="prompt-textarea"></div>';
    const composer = document.getElementById('prompt-textarea')!;

    // Un elemento che scarta ogni scrittura simula un layout incompatibile.
    Object.defineProperty(composer, 'innerText', { get: () => '', set: () => {} });

    const result = insertTextIntoComposer(composer, PROMPT);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

describe('rilevamento dello stato della conversazione', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('riconosce una conversazione esistente', async () => {
    document.body.innerHTML = '<div data-testid="conversation-turn-1"></div>';
    expect(await getAdapter('chatgpt').detectConversationState()).toBe('existing');
  });

  it('riconosce una chat nuova', async () => {
    document.body.innerHTML = '<div data-testid="welcome-screen"></div>';
    expect(await getAdapter('chatgpt').detectConversationState()).toBe('new');
  });

  it('ricade su unknown quando non ci sono indizi', async () => {
    expect(await getAdapter('gemini').detectConversationState()).toBe('unknown');
  });
});
