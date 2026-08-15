/** Storage locale su IndexedDB.
 *
 *  `browser.storage.local` non è adatto: il testo integrale di un codice
 *  supera abbondantemente i 10 MB di quota, e alzarla richiederebbe il
 *  permesso `unlimitedStorage`. IndexedDB non ha quel vincolo e non richiede
 *  alcun permesso aggiuntivo.
 */
import { StorageError } from '../api/errors';

const DB_NAME = 'civitas-extension';
const DB_VERSION = 1;

export const STORE_WORKSETS = 'worksets';
export const STORE_PENDING = 'pendingRequests';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_WORKSETS)) {
        db.createObjectStore(STORE_WORKSETS, { keyPath: 'jobId' });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'provider' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new StorageError(`Impossibile aprire il database locale: ${request.error?.message}`));
  });
}

function getDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDatabase();
  return dbPromise;
}

function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return getDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = operation(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(new StorageError(`Operazione su '${storeName}' fallita: ${request.error?.message}`));
      }),
  );
}

/** Chi chiama `put` spesso passa oggetti letti da uno store Svelte 5
 *  (`$state`), che sono Proxy: l'algoritmo di clonazione strutturata di
 *  IndexedDB non sa clonarli ("could not be cloned"). Il giro JSON li
 *  riduce a dati semplici — il contenuto di questi store è già solo
 *  stringhe/numeri/array, quindi non si perde nulla. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function put<T>(storeName: string, value: T): Promise<IDBValidKey> {
  return run<IDBValidKey>(storeName, 'readwrite', (store) => store.put(toPlain(value) as never));
}

export function get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return run<T | undefined>(storeName, 'readonly', (store) => store.get(key));
}

export function getAll<T>(storeName: string): Promise<T[]> {
  return run<T[]>(storeName, 'readonly', (store) => store.getAll());
}

export function remove(storeName: string, key: IDBValidKey): Promise<undefined> {
  return run<undefined>(storeName, 'readwrite', (store) => store.delete(key));
}

export function clear(storeName: string): Promise<undefined> {
  return run<undefined>(storeName, 'readwrite', (store) => store.clear());
}
