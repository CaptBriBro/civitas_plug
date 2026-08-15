# Civitas Browser Extension

Estensione browser per contribuire a **Civitas** senza installare nulla oltre al browser.

Sostituisce il flusso pesante di `civitas_cli` (Conda + backend locale + Ollama) con qualcosa di
molto più leggero:

- scarica l'elenco delle attività dal server Civitas — **senza login**;
- acquisisce gli articoli **da Normattiva, dal tuo browser** (tuo IP, tua sessione: niente
  rate-limit lato server);
- individua localmente e in modo deterministico gli articoli che contengono rinvii normativi;
- prepara le istruzioni AI e **precompila ChatGPT o Gemini** usando l'abbonamento che hai già —
  nessun modello locale, nessuna chiave API;
- accumula il lavoro **a pezzi** in un workset locale e lo sottomette a Civitas solo quando sei tu
  a deciderlo.

Il principio architetturale: **il codice sta nell'estensione, le istruzioni AI stanno su Civitas.**
I prompt vengono richiesti al server al momento del click sul provider, quindi si aggiornano senza
ripubblicare l'estensione su Chrome Web Store e AMO.

---

## Cosa NON fa (per scelta, non per limite tecnico)

- Non invia i messaggi nelle chat AI: **premi Invio tu**.
- Non legge le risposte dei modelli: **copi e incolli tu**.
- Non accede agli appunti (nessun permesso `clipboardRead`), alla cronologia né ai cookie.
- Non usa endpoint interni o non documentati di OpenAI e Google.
- Non esegue codice remoto: dal backend arrivano solo JSON e testo.

---

## Prerequisiti

- **Node.js 20+** (testato su 23.5)
- **npm** (incluso con Node)
- Il backend `civitas_backend` in esecuzione, se lavori in modalità sviluppo

---

## Avvio del backend (modalità sviluppo)

```bash
cd ../civitas_backend
python main.py            # ascolta su http://localhost:8030
```

Nell'estensione seleziona poi l'ambiente **Locale (dev)**: comparirà un badge arancione `DEV`
in alto, così non c'è dubbio su quale server stai usando.

> **Se il popup mostra "Server non raggiungibile" con dettaglio `Not Found`**: quasi sempre significa
> che sulla porta 8030 è rimasto in ascolto un `python main.py` **avviato prima dell'ultima modifica**
> al codice del backend — ha ancora in memoria le rotte vecchie e `/api/v1/plugin/*` non esiste per lui.
> Trova il processo e terminalo, poi riavvialo:
> ```bash
> lsof -i :8030            # individua il PID del processo python in ascolto
> kill <PID>
> cd civitas_backend && python main.py
> ```

---

## Build

```bash
cd civitas_plugin/extension
npm install

npm run build:chrome      # → .output/chrome-mv3/
npm run build:firefox     # → .output/firefox-mv2/
```

Pacchetti pronti per gli store:

```bash
npm run zip:chrome        # → .output/civitas-1.0.0-chrome.zip
npm run zip:firefox       # → .output/civitas-1.0.0-firefox.zip
```

Chrome e Firefox escono dalla **stessa codebase**: WXT genera il manifest corretto per ciascuno
(`background.service_worker` su Chrome MV3, `background.scripts` + `browser_specific_settings.gecko`
su Firefox MV2).

---

## Sviluppo con ricaricamento automatico

```bash
npm run dev:chrome        # apre un Chrome con l'estensione già caricata
npm run dev:firefox       # idem su Firefox
```

---

## Caricamento manuale

### Chrome / Edge / Brave

1. Vai su `chrome://extensions/`
2. Attiva **Modalità sviluppatore** (in alto a destra)
3. **Carica estensione non pacchettizzata**
4. Seleziona la cartella `civitas_plugin/extension/.output/chrome-mv3`

### Firefox

1. Vai su `about:debugging#/runtime/this-firefox`
2. **Carica componente aggiuntivo temporaneo…**
3. Seleziona `civitas_plugin/extension/.output/firefox-mv2/manifest.json`

> Le estensioni temporanee di Firefox vengono rimosse alla chiusura del browser.

### Dopo ogni modifica al codice

`npm run build:chrome` non ricarica l'estensione da solo. Dopo ogni build:

1. Vai su `chrome://extensions/`
2. Premi l'icona di **ricarica** (↻) sulla card di Civitas — non serve rimuoverla e ricaricarla da capo

Per non ripetere questo passaggio ad ogni modifica, usa `npm run dev:chrome` (vedi sotto): ricarica
automaticamente ad ogni salvataggio.

---

## Modalità dev e selettore dell'ambiente

L'endpoint del backend si sceglie **a runtime**, non a build time: la stessa build funziona
contro il server locale e contro la produzione.

| Ambiente | URL |
|---|---|
| Locale (dev) | `http://localhost:8030/api/v1` |
| Produzione | `https://civitas.org/api/v1` |
| Personalizzato | qualunque URL, campo libero |

Il selettore compare in tre punti:

- nel **popup** (versione compatta),
- nella **schermata di collegamento**, così scegli il server *prima* di inserire il codice,
- in **Impostazioni**, con il campo per l'endpoint personalizzato.

Quando l'ambiente non è la produzione, popup e dashboard mostrano il badge `DEV`.

La scelta è persistita in `browser.storage.local` e sincronizzata con il service worker, che la
rilegge ad ogni avvio.

---

## Popup e pannello laterale

Cliccando sull'icona si apre il **popup** classico (vetrina compatta: stato connessione, conteggio
attività, collegamento account). Da lì tre modi per lavorare:

- **Apri l'area di lavoro** → apre la dashboard in una scheda separata;
- **Apri come pannello laterale** (solo Chrome) → apre la stessa dashboard **agganciata al bordo
  del browser**, ridimensionabile, che resta visibile mentre navighi ChatGPT o Gemini nella scheda
  accanto — comodo per il flusso analizza-copia-incolla;
- il pannello laterale è raggiungibile anche dal selettore nativo dei pannelli di Chrome (l'icona
  a fianco della barra degli indirizzi), indipendentemente dal popup.

Su Firefox il pannello laterale è una vera sidebar nativa, registrata automaticamente.

---

## Come si usa

1. **Apri l'area di lavoro** dal popup (o il pannello laterale).
2. Scegli un'attività dal catalogo — funziona già senza collegare l'account.
3. **Scarica articoli**: l'acquisizione da Normattiva parte dal tuo browser e fa checkpoint dopo
   ogni articolo, quindi puoi chiudere tutto e riprendere dopo.
4. **Genera batch**: solo gli articoli che superano la soglia del parser finiscono nei batch —
   gli altri non contengono rinvii e non hanno bisogno di un modello.
5. Apri un batch e premi **Analizza con ChatGPT** (o Gemini). L'estensione chiede *prima* il prompt
   a Civitas, poi apre la chat con il composer già compilato.
6. **Premi Invio tu.** Attendi la risposta, premi **Copia** nella chat.
7. Torna nell'estensione e **incolla** nella casella "Risposta AI", poi **Salva risultato**.
8. Ripeti sui batch che vuoi. Il lavoro resta nel browser.
9. Quando sei convinto: **Sottometti proposal a Civitas**.

Per il passo 9 serve collegare l'account: sul sito Civitas apri **Profilo → Estensione browser**,
genera un codice `NC-XXXX-XXXX-XXXX` e inseriscilo nell'estensione. Il codice vale 10 minuti ed è
monouso; ogni browser riceve una credenziale distinta, revocabile singolarmente.

---

## Verifiche

```bash
npm test                  # 58 test unitari
npm run typecheck         # svelte-check, 0 errori
```

Cosa coprono i test: parser dei riferimenti (con corpus e metriche di precision/recall), parser
dell'albero multivigenza e degli articoli di Normattiva su fixture HTML, interpretazione della
risposta AI, validazione e scadenza dei prompt, suddivisione in batch, adapter dei provider su
fixture DOM — incluso il controllo che **nessun prompt venga mai inviato automaticamente**.

---

## Stack

| Componente | Scelta |
|---|---|
| Framework estensione | WXT 0.19 |
| UI | Svelte 5 (runes) |
| Linguaggio | TypeScript strict |
| Stili | Tailwind 4 + design system di `civitas_cli` |
| Icone | lucide-svelte |
| Test | Vitest + happy-dom |
| Storage | IndexedDB (articoli e workset) + `browser.storage.local` (sessione e preferenze) |

---

## Struttura

```
civitas_plugin/
├── README.md
├── README_BUILD.md          istruzioni di build riproducibile per AMO
├── img/                     logo sorgente
└── extension/
    ├── wxt.config.ts
    └── src/
        ├── entrypoints/     background, popup, dashboard, content script
        ├── domain/          tipi puri (job, articolo, candidato, prompt, workset)
        ├── config/          selettore ambiente e versioni
        ├── services/        api/ normattiva/ storage/ browser/
        ├── parser/          riconoscimento dei rinvii normativi
        ├── adapters/ai/     ChatGPT e Gemini
        ├── features/        auth, articoli, prompt, ai, risultati
        ├── stores/          stato condiviso (runes)
        ├── components/      ui/ layout/ jobs/ article/ prompt/ results/ settings/
        └── views/           schermate della dashboard
```

Nessun file supera le 300 righe: le schermate sono gusci di composizione e la logica vive nei
service layer, mai dentro i componenti Svelte.

---

## Permessi richiesti

```json
"permissions": ["storage"],
"host_permissions": [
  "https://www.normattiva.it/*",
  "https://chatgpt.com/*",
  "https://gemini.google.com/*",
  "http://localhost:8030/*"
]
```

`storage` è l'unico permesso. Nessun `<all_urls>`, nessun `clipboardRead`, nessun `tabs` generico.
L'host locale serve solo alla modalità sviluppo.

---

## Troubleshooting

**Normattiva risponde con una pagina di errore**
Il portale richiede un warm-up che imposta i cookie di sessione. Il client lo fa in automatico e
lo ripete al primo fallimento; se persiste, apri `https://www.normattiva.it` in una scheda e
riprova.

**Il download è lento**
È voluto: il client rispetta un limite di una richiesta al secondo per non farsi bloccare. Un
libro del Codice Civile richiede parecchi minuti — ma l'acquisizione riprende da dove si era
interrotta.

**"Impossibile contattare il server Civitas"**
Verifica che `civitas_backend` sia avviato su `:8030` e che l'ambiente selezionato sia quello
giusto. Il backend accetta le origini `chrome-extension://` e `moz-extension://`.

**"Composer non trovato: l'interfaccia potrebbe essere cambiata"**
ChatGPT o Gemini hanno modificato il DOM. Il prompt resta valido: usa **Copia prompt** e incollalo
a mano — il job resta completabile. I selettori stanno tutti in
`src/adapters/ai/selectors.ts`.

**"Il prompt ricevuto risulta già scaduto"**
Il batch è rimasto aperto oltre la scadenza. Ripremi il pulsante del provider: viene richiesto un
prompt nuovo, con la versione corrente delle istruzioni.
