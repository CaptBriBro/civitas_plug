/** Client HTTP per Normattiva.
 *
 *  Port di `civitas_cli/backend/engine_downloader/normattiva_client.py`.
 *  `requests.Session` diventa `fetch`: i cookie di sessione sono già gestiti
 *  dal browser, ma il warm-up resta obbligatorio perché è la richiesta che
 *  li imposta e che restituisce codice redazionale e data di Gazzetta.
 *
 *  Va eseguito nel background service worker: le host permissions aggirano
 *  la CORS solo lì, non nel popup.
 *
 *  Endpoint (cfr. docs/NORMATTIVA_FINDINGS.md di civitas_engine):
 *    warm-up : GET /uri-res/N2Ls?<urn>
 *    albero  : GET /atto/caricaDettaglioAtto?...&tipoDettaglio=multivigenza
 *    articolo: GET /atto/caricaArticolo?<params opachi dall'albero>
 */
import { NormattivaError } from '../api/errors';
import type { ActInfo } from './types';

const BASE_URL = 'https://www.normattiva.it';
const RATE_LIMIT_MS = 1000;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 20_000;

const COD_REDAZIONALE_RE = /codiceRedazionale=([^&'"]+)/;
const DATA_GAZZETTA_RE = /dataPubblicazioneGazzetta=([^&'"]+)/;

function isErrorPage(html: string): boolean {
  const head = html.slice(0, 4000).toLowerCase();
  return head.includes('<title>normattiva - errore') || head.includes('pagina non trovata');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class NormattivaClient {
  private lastRequestAt = 0;
  private warmedUrn: string | null = null;
  private lastActInfo: ActInfo | null = null;

  constructor(private readonly baseUrl: string = BASE_URL) {}

  /** Normattiva rifiuta le raffiche: si mantiene una richiesta al secondo. */
  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  }

  private async get(url: string, urn?: string): Promise<string> {
    if (urn) await this.warmup(urn);

    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      await this.throttle();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          credentials: 'include',
          signal: controller.signal,
        });
        this.lastRequestAt = Date.now();

        if (!response.ok) throw new NormattivaError(`HTTP ${response.status} da Normattiva.`);

        const text = await response.text();
        if (!text) throw new NormattivaError('Risposta vuota da Normattiva.');
        if (isErrorPage(text)) throw new NormattivaError('Normattiva ha restituito una pagina di errore.');

        return text;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          // Il cookie di sessione può essere scaduto: si riscalda e si riprova.
          if (urn) await this.warmup(urn, true);
          await sleep(2 ** attempt * 1000 + Math.random() * 1000);
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new NormattivaError(`Errore di connessione a Normattiva (${detail}).`);
  }

  /** Risolve l'URN e imposta i cookie di sessione. Senza questo passaggio le
   *  chiamate successive rispondono con una pagina di errore.
   *
   *  Un fallimento non viene mai messo in cache: se restasse segnato come
   *  "già tentato" con dati vuoti, i tentativi successivi rinuncerebbero a
   *  ripetere la richiesta e il download proseguirebbe silenziosamente senza
   *  sessione valida. */
  async warmup(urn: string, force = false): Promise<ActInfo> {
    if (!force && this.warmedUrn === urn && this.lastActInfo) return this.lastActInfo;

    try {
      const html = await this.get(`${this.baseUrl}/uri-res/N2Ls?${urn}`);
      this.lastActInfo = {
        codiceRedazionale: COD_REDAZIONALE_RE.exec(html)?.[1] ?? '',
        dataPubblicazioneGazzetta: (DATA_GAZZETTA_RE.exec(html)?.[1] ?? '').split(' ')[0] ?? '',
      };
      this.warmedUrn = urn;
    } catch {
      this.warmedUrn = null;
      this.lastActInfo = null;
    }

    return this.lastActInfo ?? { codiceRedazionale: '', dataPubblicazioneGazzetta: '' };
  }

  /** Albero multivigenza dell'atto: unità strutturali, articoli e versioni. */
  async getTree(urn: string, codiceRedazionale?: string, dataGazzetta?: string): Promise<string> {
    const info = await this.warmup(urn);
    const cod = codiceRedazionale || info.codiceRedazionale;
    const dgu = dataGazzetta || info.dataPubblicazioneGazzetta;

    if (!cod || !dgu) {
      // Senza questi parametri Normattiva non sa quale atto mostrare e
      // risponde con una pagina generica che verrebbe interpretata come
      // "zero articoli" invece che come errore.
      throw new NormattivaError(
        "Impossibile identificare l'atto su Normattiva (warm-up non riuscito). Riprova tra qualche secondo.",
      );
    }

    const url =
      `${this.baseUrl}/atto/caricaDettaglioAtto?atto.dataPubblicazioneGazzetta=${dgu}` +
      `&atto.codiceRedazionale=${cod}&tipoDettaglio=multivigenza`;

    return this.get(url);
  }

  /** HTML di una singola versione di articolo. */
  async getArticleHtml(caricaParams: string, urn: string): Promise<string> {
    return this.get(`${this.baseUrl}/atto/caricaArticolo?${caricaParams}`, urn);
  }
}
