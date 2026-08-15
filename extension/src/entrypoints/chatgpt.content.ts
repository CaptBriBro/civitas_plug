/** Content script ChatGPT.
 *
 *  Fa una cosa sola: se esiste un prompt pendente lo inserisce nel composer.
 *
 *  Non invia il messaggio, non legge la risposta, non osserva la conversazione
 *  e non tocca la clipboard. Invio, copia e incolla restano azioni dell'utente.
 */
import { defineContentScript } from 'wxt/sandbox';
import { runProviderContentScript } from '@/features/ai/contentRunner';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  main: () => runProviderContentScript('chatgpt'),
});
