/** Errori tipizzati: la UI decide cosa mostrare in base alla classe, non a un
 *  parsing del messaggio. */

export class CivitasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Il backend non è raggiungibile: rete assente, server spento, CORS. */
export class NetworkError extends CivitasError {}

/** Il backend ha risposto con un codice di errore. */
export class ApiError extends CivitasError {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data: unknown = null,
  ) {
    super(message);
  }
}

/** Credenziale assente, scaduta o revocata. */
export class AuthError extends CivitasError {}

/** Il prompt non è utilizzabile: mancante, scaduto, provider non supportato. */
export class PromptError extends CivitasError {}

/** Errore durante l'acquisizione da Normattiva. */
export class NormattivaError extends CivitasError {}

/** Il composer del provider non è stato trovato o non ha accettato il testo. */
export class ProviderError extends CivitasError {}

/** Errore di lettura/scrittura sullo storage locale. */
export class StorageError extends CivitasError {}

export function messageFor(error: unknown): string {
  if (error instanceof CivitasError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
