# Istruzioni di build riproducibile

Documento richiesto da **addons.mozilla.org** quando il codice sorgente pubblicato viene
sottoposto a revisione: permette al revisore di ottenere esattamente lo stesso pacchetto caricato.

## Ambiente di riferimento

| Componente | Versione |
|---|---|
| Sistema operativo | qualunque (build verificata su macOS 15, arm64) |
| Node.js | 20.x o superiore |
| npm | 10.x o superiore |

Nessuna dipendenza nativa, nessuno step di compilazione al di fuori di npm.

## Passaggi

```bash
cd extension
npm ci
npm run build:firefox
npm run zip:firefox
```

Risultato: `extension/.output/civitas-<versione>-firefox.zip`

`npm ci` installa esclusivamente le versioni bloccate in `package-lock.json`, quindi la build è
deterministica a parità di lockfile.

## Cosa contiene il sorgente

- `extension/src/` — tutto il codice applicativo (TypeScript e Svelte)
- `extension/wxt.config.ts` — configurazione del framework e generazione del manifest
- `extension/package.json`, `extension/package-lock.json` — dipendenze bloccate
- `img/` — logo sorgente da cui sono derivate le icone

## Cosa NON è incluso nel pacchetto

- `node_modules/` — ricostruito da `npm ci`
- `.output/`, `.wxt/` — artefatti generati
- `extension/tests/` — non entra nel bundle

## Note per la revisione

- **Nessun codice minificato scritto a mano**: tutto ciò che è minificato nel pacchetto è prodotto
  da Vite a partire dai sorgenti presenti nel repository.
- **Nessun codice remoto**: l'estensione non scarica né esegue JavaScript proveniente dalla rete.
  Dal backend Civitas arrivano solo JSON e testo (elenco attività, prompt), che vengono trattati
  come dati e mai valutati. Non esistono usi di `eval`, `new Function` o `innerHTML`.
- **Il testo dei prompt è configurato lato server** per poter aggiornare le istruzioni AI senza
  ripubblicare l'estensione. È un dato: viene inserito in una casella di testo, mai eseguito.
- **Nessuna lettura automatica delle risposte AI**: l'estensione non contiene osservatori del DOM
  sulle conversazioni. Il trasferimento della risposta avviene tramite copia e incolla manuali
  dell'utente, senza il permesso `clipboardRead`.
- **Nessun invio automatico**: il content script inserisce il testo nel composer e si ferma.
- Il permesso host su `http://localhost:8030` serve unicamente alla modalità sviluppo, selezionabile
  dall'interfaccia, ed è documentato nella privacy disclosure.

## Verifica dell'integrità

```bash
cd extension
npm ci
npm test          # 58 test unitari
npm run typecheck # svelte-check
npm run build:firefox
```
