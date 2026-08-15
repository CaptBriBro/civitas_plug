/** DTO del downloader Normattiva, portati da `engine_downloader/schema.py`. */

export interface UnitRef {
  unitType: string;
  label: string;
  heading: string | null;
  ordering: number;
  path: string[];
}

export interface VersionRef {
  versionLabel: string;
  versionOrder: number;
  /** Parametri opachi presi dall'albero, da rigirare a `caricaArticolo`. */
  caricaParams: string;
  isCurrent: boolean;
}

export interface ArticleRef {
  numero: string;
  ordering: number;
  normattivaArticleId: string | null;
  gruppo: string | null;
  rubrica: string | null;
  unitPath: string[];
  versions: VersionRef[];
}

export interface ParsedVersion {
  versionLabel: string;
  vigenzaStart: string | null;
  vigenzaEnd: string | null;
  rubrica: string | null;
  testo: string;
}

export interface ActInfo {
  codiceRedazionale: string;
  dataPubblicazioneGazzetta: string;
}
