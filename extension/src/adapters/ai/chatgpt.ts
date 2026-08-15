/** Adapter ChatGPT.
 *
 *  Le specificità del provider vivono nei selettori (`selectors.ts`); qui
 *  resta solo l'istanza. Nessuna lettura dell'output, nessun invio automatico,
 *  nessun endpoint interno di OpenAI.
 */
import { createAdapter } from './createAdapter';

export const chatGptAdapter = createAdapter('chatgpt');
