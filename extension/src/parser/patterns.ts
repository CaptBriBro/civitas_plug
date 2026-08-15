/** Tabella dei pattern di rinvio normativo.
 *
 *  Portata da `civitas_cli/backend/services/candidate_detector.py`, con
 *  l'aggiunta delle forme abbreviate (`art. 2043 c.c.`, `comma 2 dell'art. 7`)
 *  e dei codici di rito.
 *
 *  I punteggi sono tarati per privilegiare il **recall**: è preferibile
 *  proporre all'utente un articolo in più che perdere un rinvio reale.
 */
import type { CandidateType } from '@/domain/candidate';

export interface CandidatePattern {
  source: string;
  score: number;
  label: string;
  type: CandidateType;
}

export const CANDIDATE_PATTERNS: CandidatePattern[] = [
  { source: String.raw`\bABROGA(?:TO|TI|TA|TE|ZION[IE])\b`, score: 1.0, label: 'Abrogazione', type: 'generic_normative_reference' },
  { source: String.raw`\bSOSTITUIT[OATI]\b|\bSOSTITUZIONE\b`, score: 0.95, label: 'Sostituzione', type: 'generic_normative_reference' },
  { source: String.raw`\bIN DEROGA\b`, score: 0.95, label: 'Deroga', type: 'generic_normative_reference' },
  { source: String.raw`\bSALVO QUANTO (?:DISPOSTO|PREVISTO)\b|\bFATTO SALVO\b|\bFATTA SALVA\b`, score: 0.9, label: 'Eccezione / Fatto salvo', type: 'generic_normative_reference' },
  { source: String.raw`\bPER QUANTO NON PREVISTO\b`, score: 0.9, label: 'Applicazione residuale', type: 'generic_normative_reference' },
  { source: String.raw`\bSI APPLICA(?:NO)?\b|\bTROVA(?:NO)? APPLICAZIONE\b`, score: 0.85, label: 'Applicazione', type: 'generic_normative_reference' },
  { source: String.raw`\bIN QUANTO COMPATIBIL[IE]\b`, score: 0.85, label: 'Compatibilità', type: 'generic_normative_reference' },
  { source: String.raw`\bFERMO RESTANDO\b|\bRESTA FERMO\b`, score: 0.85, label: 'Fermo restando', type: 'generic_normative_reference' },
  { source: String.raw`\bNON SI APPLICA(?:NO)?\b`, score: 0.85, label: 'Esclusione', type: 'generic_normative_reference' },
  { source: String.raw`\bNEI LIMITI PREVISTI\b|\bALLE CONDIZIONI PREVISTE\b`, score: 0.8, label: 'Condizione / Limite', type: 'generic_normative_reference' },

  // Rinvii espressi
  { source: String.raw`\bAI SENSI DEL(?:L')?\b|\bA NORMA DEL(?:L')?\b|\bDI CUI AL(?:L')?\b|\bPREVIST[OI] DAL(?:L')?\b|\bRICHIAMAT[OI] DAL(?:L')?\b`, score: 0.75, label: 'Riferimento generico', type: 'generic_normative_reference' },

  // Citazioni di atti esterni
  { source: String.raw`\b(?:LEGGE|L\.|D\.\s?LGS\.?|DECRETO LEGISLATIVO|D\.\s?P\.\s?R\.?|DECRETO[-\s]LEGGE|D\.\s?L\.|R\.\s?D\.|REGIO DECRETO)\s*(?:N\.\s*)?\d+`, score: 0.85, label: 'Citazione atto esterno', type: 'law_reference' },
  { source: String.raw`\bDECRETO(?:\s+DEL)?\s+PRESIDENTE\s+DELLA\s+REPUBBLICA\b`, score: 0.85, label: 'Citazione atto esterno', type: 'decree_reference' },

  // Codici
  { source: String.raw`\bCODICE\s+(?:CIVILE|PENALE|DI\s+PROCEDURA\s+(?:CIVILE|PENALE))\b`, score: 0.8, label: 'Rinvio a codice', type: 'code_reference' },
  { source: String.raw`\b(?:C\.\s?C\.|C\.\s?P\.|C\.\s?P\.\s?C\.|C\.\s?P\.\s?P\.)(?=\W|$)`, score: 0.75, label: 'Rinvio a codice', type: 'code_reference' },

  // Articoli e commi
  { source: String.raw`\bARTICOL[OI]\s+\d+`, score: 0.7, label: 'Menzione articolo', type: 'article_reference' },
  { source: String.raw`\bARTT?\.\s*\d+`, score: 0.7, label: 'Menzione articolo', type: 'article_reference' },
  { source: String.raw`\bCOMMA\s+\d+\b`, score: 0.65, label: 'Menzione comma', type: 'paragraph_reference' },
  { source: String.raw`\bARTICOLO\s+PRECEDENTE\b|\bARTICOLO\s+SEGUENTE\b|\bCOMMA\s+PRECEDENTE\b`, score: 0.6, label: 'Rinvio relativo', type: 'article_reference' },
];

/** Contesti in cui una parola-chiave non indica un rinvio normativo.
 *  "salvo che il fatto costituisca più grave reato" è una clausola penale,
 *  non un richiamo ad altra norma. */
export const FALSE_POSITIVE_EXCLUSIONS: RegExp[] = [
  /salvo che il fatto/i,
  /salvo che il debitore/i,
  /salvo che sia diversamente/i,
  /salvo patto contrario/i,
];

/** Estrae numero di articolo, tipo, numero e anno dell'atto citato. */
export const PARSED_REFERENCE_PATTERNS = {
  article: /\bart(?:ic(?:olo|oli)?)?\.?\s*(\d+(?:[-\s]?(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies))?)/i,
  lawType: /\b(legge|decreto legislativo|d\.\s?lgs\.?|d\.\s?p\.\s?r\.?|decreto[-\s]legge|d\.\s?l\.|r\.\s?d\.|regio decreto)\b/i,
  lawNumberYear: /\bn\.?\s*(\d+)\s*(?:\/|\s+del\s+)?\s*(\d{4})?|\b(\d{1,4})\/(\d{4})\b/i,
  year: /\b(1[89]\d{2}|20\d{2})\b/,
};
