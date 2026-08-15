/** Adapter Gemini.
 *
 *  Stessa architettura di ChatGPT: le differenze di DOM sono isolate in
 *  `selectors.ts`, così non serve un file per browser né logica duplicata.
 */
import { createAdapter } from './createAdapter';

export const geminiAdapter = createAdapter('gemini');
