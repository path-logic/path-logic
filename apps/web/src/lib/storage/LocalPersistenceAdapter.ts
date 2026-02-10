/**
 * Local Persistence Adapter for browser-based database fallback.
 * Stores encrypted database blobs in IndexedDB to prevent data loss
 * when the Google Drive session is expired or unavailable.
 */

const appEnv: string = process.env['NEXT_PUBLIC_APP_ENV'] || 'development';
const DB_NAME: string = `PathLogicLocalCache-${appEnv}`;
const STORE_NAME = 'backups';
const KEY_NAME = 'current_ledger_encrypted';
const DB_VERSION = 1;

/**
 * Open the IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve: (value: IDBDatabase) => void, reject: (reason: Error) => void) => {
        const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
            const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (): void => resolve(request.result);
        request.onerror = (): void => reject(request.error as Error);
    });
}

/**
 * Save an encrypted database blob to local storage
 */
export async function saveLocalFallback(data: Uint8Array): Promise<void> {
    try {
        const db: IDBDatabase = await openDB();
        return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
            const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(STORE_NAME);
            const request: IDBRequest = store.put(data, KEY_NAME);

            request.onsuccess = (): void => {
                console.log('[LocalPersistence] Encrypted database saved to browser cache');
                resolve();
            };
            request.onerror = (): void => reject(request.error as Error);
        });
    } catch (error) {
        console.error('[LocalPersistence] Failed to save local fallback:', error);
        throw error;
    }
}

/**
 * Load the encrypted database blob from local storage
 */
export async function loadLocalFallback(): Promise<Uint8Array | null> {
    try {
        const db: IDBDatabase = await openDB();
        return new Promise(
            (resolve: (value: Uint8Array | null) => void, reject: (reason: Error) => void) => {
                const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readonly');
                const store: IDBObjectStore = transaction.objectStore(STORE_NAME);
                const request: IDBRequest = store.get(KEY_NAME);

                request.onsuccess = (): void => {
                    const result: unknown = request.result;
                    if (result instanceof Uint8Array) {
                        resolve(result);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = (): void => reject(request.error as Error);
            },
        );
    } catch (error) {
        console.error('[LocalPersistence] Failed to load local fallback:', error);
        return null; // Silent fail, fallback to GDrive
    }
}

/**
 * Clear the local fallback storage
 */
export async function clearLocalFallback(): Promise<void> {
    try {
        const db: IDBDatabase = await openDB();
        return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
            const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(STORE_NAME);
            const request: IDBRequest = store.delete(KEY_NAME);

            request.onsuccess = (): void => {
                console.log('[LocalPersistence] Local cache cleared');
                resolve();
            };
            request.onerror = (): void => reject(request.error as Error);
        });
    } catch (error) {
        console.warn('[LocalPersistence] Failed to clear local fallback:', error);
    }
}

/**
 * Check if a local fallback exists
 */
export async function hasLocalFallback(): Promise<boolean> {
    const data = await loadLocalFallback();
    return data !== null;
}
