import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

/**
 * Una sola codebase, due build. WXT genera il manifest corretto per ciascun
 * browser: `service_worker` su Chrome MV3, `scripts` + `gecko.id` su Firefox.
 *
 * Permessi: solo `storage`. Nessun clipboardRead, nessun <all_urls>.
 * Le host permissions sono limitate a Normattiva, ai due provider AI e al
 * backend Civitas (l'host locale serve unicamente in modalità sviluppo).
 */
export default defineConfig({
  // Con srcDir 'src' l'alias `@` generato da WXT punta già a src/: tutti gli
  // import interni usano `@/...` e restano validi anche nei test Vitest.
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Civitas',
    description:
      "Scarica le attività Civitas, acquisisce gli articoli da Normattiva e precompila ChatGPT o Gemini con le istruzioni ufficiali. Non invia i messaggi né legge le risposte: restano azioni dell'utente.",
    default_locale: undefined,
    permissions: ['storage'],
    host_permissions: [
      'https://www.normattiva.it/*',
      'https://chatgpt.com/*',
      'https://gemini.google.com/*',
      'http://localhost:8030/*',
      'http://127.0.0.1:8030/*',
    ],
    browser_specific_settings: {
      gecko: {
        id: 'estensione@civitas.org',
        strict_min_version: '115.0',
      },
    },
  },
});
