/** Parser per la tabella degli aggiornamenti all'atto di Normattiva (senza DOMParser per Service Worker). */
import type { ActUpdateEntry } from '@/domain/workset';
import { stripTags } from './htmlUtils';

export function parseActUpdatesHtml(html: string): ActUpdateEntry[] {
  const entries: ActUpdateEntry[] = [];
  
  // Trova tutti i tag <tr>...</tr>
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;

  let currentProgr: string | null = null;
  let currentDate: string | null = null;
  let currentAct: string | null = null;

  const artRegex = /\b(?:art(?:icolo)?\.?|articoli)\s*(\d+[a-z\-]*(?:\s*(?:,|e|al)\s*\d+[a-z\-]*)*)/gi;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1] || '';
    
    // Trova tutti i tag <td>...</td>
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      cells.push(stripTags(tdMatch[1] || '').trim());
    }

    if (cells.length < 3) continue;

    const progrRaw = cells[0] || '';
    const dateRaw = cells[1] || '';
    const contentRaw = cells[2] || '';

    if (progrRaw) currentProgr = progrRaw;
    if (dateRaw) currentDate = dateRaw;

    const lines = contentRaw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0] || '';
    let dispositionText = contentRaw;
    const isActHeading =
      ['LEGGE', 'DECRETO', 'D.L.', 'D.LGS', 'R.D.', 'D.P.R.'].some((k) =>
        firstLine.toUpperCase().includes(k)
      ) && firstLine.length < 180;

    if (isActHeading) {
      currentAct = firstLine;
      dispositionText = lines.length > 1 ? lines.slice(1).join('\n') : firstLine;
    }

    const detectedArticles: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = artRegex.exec(dispositionText)) !== null) {
      detectedArticles.push(match[0]);
    }

    entries.push({
      progr: currentProgr,
      data_pubblicazione: currentDate,
      atto_modificante: currentAct,
      testo_disposizione: (dispositionText || '').trim(),
      target_articles_detected: Array.from(new Set(detectedArticles)),
    });
  }

  return entries;
}
