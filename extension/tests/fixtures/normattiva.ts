/** Frammenti HTML di Normattiva, ridotti all'essenziale.
 *
 *  Servono a far girare i test senza dipendere dal sito live: la struttura
 *  riproduce quella reale (albero `#albero`, `div.collapse-div` per le unità,
 *  `a.numero_articolo` per articoli e versioni).
 */

export const TREE_HTML = `
<div id="albero">
  <div class="collapse-div">
    LIBRO QUARTO<br/>
    Delle obbligazioni
  </div>
  <div class="collapse-div">
    TITOLO IX<br/>
    Dei fatti illeciti
  </div>
  <a class="numero_articolo" href="/atto/caricaArticolo?art.idArticolo=2043&amp;art.idGruppo=77">
    art. 2043
  </a>
  <a class="numero_articolo" href="/atto/caricaArticolo?art.idArticolo=2043&amp;art.versione=orig">
    orig.
  </a>
  <a class="numero_articolo" href="/atto/caricaArticolo?art.idArticolo=2043&amp;art.versione=1">
    agg. 1
  </a>
  <a class="numero_articolo" href="/atto/caricaArticolo?art.idArticolo=2044&amp;art.idGruppo=77">
    art. 2044
  </a>
</div>
`;

export const ARTICLE_HTML = `
<html>
  <body>
    <div class="vigore">in vigore dal: 16-03-1942 al: 31-12-2020</div>
    <div id="testoNormalizzato">
      (Risarcimento per fatto illecito)

      Qualunque fatto doloso o colposo, che cagiona ad altri un danno ingiusto,
      obbliga colui che ha commesso il fatto a risarcire il danno.

      Articolo precedente
      Articolo successivo
    </div>
  </body>
</html>
`;

export const ARTICLE_HTML_FALLBACK_SELECTOR = `
<html>
  <body>
    <span class="art-testo">
      (Legittima difesa)
      Non è responsabile chi cagiona il danno per legittima difesa di sé o di altri.
    </span>
  </body>
</html>
`;

export const ERROR_PAGE_HTML = `
<html><head><title>Normattiva - Errore</title></head><body>Pagina non trovata</body></html>
`;
