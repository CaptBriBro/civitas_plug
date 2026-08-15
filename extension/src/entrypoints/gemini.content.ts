/** Content script Gemini.
 *
 *  Identico a quello di ChatGPT: le differenze di DOM stanno nei selettori,
 *  quindi non serve un file per provider oltre a questo punto d'ingresso.
 */
import { defineContentScript } from 'wxt/sandbox';
import { runProviderContentScript } from '@/features/ai/contentRunner';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  runAt: 'document_idle',
  main: () => runProviderContentScript('gemini'),
});
