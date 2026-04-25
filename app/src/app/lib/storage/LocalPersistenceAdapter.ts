/**
 * Local Persistence Adapter — PRIMARY storage layer.
 *
 * IndexedDB is the primary, always-available data store in Path Logic.
 * Google Drive is the background cloud sync layer.
 *
 * On every mutation the encrypted SQLite snapshot is committed here first
 * (write-through). Drive upload happens asynchronously via SyncService.
 *
 * ## Stored structure
 *
 *   ILocalSnapshot {
 *     encryptedData  — AES-GCM encrypted SQLite binary
 *     version        — Unix timestamp (ms) of the last local write
 *     deviceId       — random ID generated once per browser install
 *   }
 *
 * The `version` field is compared against Drive's `modifiedTime` during
 * background sync to decide whether to download (Drive is newer) or
 * upload (local is newer).
 */

import { environment } from '../../../environments/environment';

const DB_NAME: string = `PathLogicLocalCache-${environment.appEnv}`;
const STORE_NAME = 'backups';
const KEY_SNAPSHOT = 'ledger_snapshot_v2';
const KEY_DEVICE_ID = 'pl_device_id';
const DB_VERSION = 2; // bumped from 1 → 2 for new schema

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ILocalSnapshot {
    /** AES-GCM encrypted SQLite binary (same format as Drive blob) */
    encryptedData: Uint8Array;
    /** Unix timestamp (ms) of the last local commit */
    version: number;
    /** Stable random device identifier, persisted in localStorage */
    deviceId: string;
}

// ── Device ID ─────────────────────────────────────────────────────────────────

function getOrCreateDeviceId(): string {
    try {
        let id = localStorage.getItem(KEY_DEVICE_ID);
        if (!id) {
            id = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
            localStorage.setItem(KEY_DEVICE_ID, id);
        }
        return id;
    } catch {
        return 'unknown-device';
    }
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (): void => resolve(request.result);
        request.onerror = (): void => reject(request.error as Error);
    });
}

// ── Primary API ───────────────────────────────────────────────────────────────

/**
 * Save an encrypted snapshot to IndexedDB.
 * Called on every mutation — this is the local commit.
 *
 * @param encryptedData  AES-GCM encrypted SQLite binary
 * @param version        Unix timestamp (ms) — defaults to Date.now()
 */
export async function saveLocalSnapshot(
    encryptedData: Uint8Array,
    version: number = Date.now()
): Promise<void> {
    try {
        const snapshot: ILocalSnapshot = {
            encryptedData,
            version,
            deviceId: getOrCreateDeviceId()
        };
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(snapshot, KEY_SNAPSHOT);
            req.onsuccess = (): void => resolve();
            req.onerror = (): void => reject(req.error as Error);
        });
    } catch (error) {
        console.error('[LocalPersistence] Failed to save snapshot:', error);
        throw error;
    }
}

/**
 * Load the snapshot from IndexedDB.
 * Returns null if no local data exists (new device / first install).
 */
export async function loadLocalSnapshot(): Promise<ILocalSnapshot | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(KEY_SNAPSHOT);

            req.onsuccess = (): void => {
                const result: unknown = req.result;
                if (
                    result &&
                    typeof result === 'object' &&
                    'encryptedData' in result &&
                    'version' in result &&
                    result.encryptedData instanceof Uint8Array
                ) {
                    resolve(result as ILocalSnapshot);
                } else if (result instanceof Uint8Array) {
                    // Migrate old v1 blob (plain Uint8Array) → v2 structure
                    resolve({
                        encryptedData: result,
                        version: Date.now(),
                        deviceId: getOrCreateDeviceId()
                    });
                } else {
                    resolve(null);
                }
            };
            req.onerror = (): void => reject(req.error as Error);
        });
    } catch (error) {
        console.error('[LocalPersistence] Failed to load snapshot:', error);
        return null;
    }
}

/**
 * Returns the version timestamp of the local snapshot, or 0 if none exists.
 * Used by background sync to compare against Drive's modifiedTime.
 */
export async function getLocalVersion(): Promise<number> {
    const snapshot = await loadLocalSnapshot();
    return snapshot?.version ?? 0;
}

/**
 * Clear the stored snapshot (e.g. on sign-out).
 */
export async function clearLocalSnapshot(): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(KEY_SNAPSHOT);
            req.onsuccess = (): void => {
                console.log('[LocalPersistence] Snapshot cleared');
                resolve();
            };
            req.onerror = (): void => reject(req.error as Error);
        });
    } catch (error) {
        console.warn('[LocalPersistence] Failed to clear snapshot:', error);
    }
}

// ── Legacy aliases (deprecated — kept for migration safety) ───────────────────

/** @deprecated Use saveLocalSnapshot() */
export async function saveLocalFallback(data: Uint8Array): Promise<void> {
    return saveLocalSnapshot(data);
}

/** @deprecated Use loadLocalSnapshot() */
export async function loadLocalFallback(): Promise<Uint8Array | null> {
    const snap = await loadLocalSnapshot();
    return snap?.encryptedData ?? null;
}

/** @deprecated Use clearLocalSnapshot() */
export async function clearLocalFallback(): Promise<void> {
    return clearLocalSnapshot();
}

/** @deprecated Use loadLocalSnapshot() */
export async function hasLocalFallback(): Promise<boolean> {
    const snap = await loadLocalSnapshot();
    return snap !== null;
}
