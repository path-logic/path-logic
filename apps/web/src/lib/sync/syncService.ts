import { useLedgerStore } from '@/store/ledgerStore';
import { encryptDatabase, decryptDatabase } from '@/lib/crypto/encryption';
import {
    findDatabaseFile,
    downloadDatabase,
    uploadDatabase,
    getLockStatus,
    acquireLock,
    releaseLock,
    forceReleaseLock as driveForceReleaseLock,
} from '@/lib/storage/GoogleDriveAdapter';
import {
    saveLocalFallback,
    loadLocalFallback,
    clearLocalFallback,
} from '@/lib/storage/LocalPersistenceAdapter';
import { getClientId, getDb, createIsolatedDatabase } from '@/lib/storage/SQLiteAdapter';
import { SQLiteMergeEngine } from './MergeEngine';
import { GDriveAuthError } from '@/lib/storage/errors';

/**
 * Sync service that orchestrates the full pipeline:
 * SQLite → Export → Encrypt → Upload to Drive
 * Drive → Download → Decrypt → Load into SQLite
 */

/**
 * Sync status information
 */
export interface ISyncStatus {
    /** Whether a sync operation is currently in progress */
    inProgress: boolean;
    /** Timestamp (milliseconds since epoch) of the last successful sync, or 0 if never synced */
    lastSyncTime: number;
}

let syncInProgress: boolean = false;
let lastSyncTime: number = 0;
const SYNC_DEBOUNCE_MS = 2000; // 2 seconds

/**
 * Load encrypted database from Drive and initialize local store
 */
export async function loadFromDrive(accessToken: string, userId: string): Promise<void> {
    try {
        // Find context
        const store = useLedgerStore.getState();

        // Check for local fallback first (it might be newer than Drive)
        const localData = await loadLocalFallback();
        if (localData) {
            console.log('[Sync] Found local fallback data, checking for sync opportunity...');
            try {
                const decryptedData = await decryptDatabase(localData, userId);
                await store.loadFromEncryptedData(decryptedData);
                store.setHasLocalFallback(true);
                store.setSyncStatus('pending-local');
                console.log('[Sync] Loaded from local fallback successfully');

                // If we have an access token, try to sync this local data to Drive
                if (accessToken) {
                    await saveToDrive(accessToken, userId);
                    // clearLocalFallback is handled inside saveToDrive on success
                }
                return;
            } catch (error) {
                console.error('[Sync] Failed to load from local fallback:', error);
                // Continue to Drive load if local fails
            }
        }

        // Skip Drive load if no access token
        if (!accessToken) {
            await store.initialize();
            return;
        }

        // Find the database file in Drive
        const file: Awaited<ReturnType<typeof findDatabaseFile>> =
            await findDatabaseFile(accessToken);

        if (!file) {
            // No existing database, initialize empty
            console.log('No existing database found, initializing empty database');
            await store.initialize();
            return;
        }

        // Download encrypted database
        const encryptedData: Uint8Array = await downloadDatabase(accessToken, file.id);

        // Decrypt
        let remoteDecryptedData: Uint8Array;
        try {
            remoteDecryptedData = await decryptDatabase(encryptedData, userId);
        } catch (decryptError) {
            console.error(
                '[Sync] Failed to decrypt remote database. Possible key mismatch between environments.',
                decryptError,
            );
            throw new Error(
                'Encryption key mismatch: The remote file was likely encrypted in a different environment (e.g. Local vs Production).',
            );
        }

        // If we have local data, merge. Otherwise just load.
        if (store.isInitialized) {
            console.log('[Sync] Database already initialized, merging remote data...');
            const remoteDb = await createIsolatedDatabase(remoteDecryptedData);
            const localDb = getDb();

            if (localDb) {
                const changed = await SQLiteMergeEngine.mergeRemoteIntoLocal(remoteDb, localDb);
                if (changed) {
                    console.log('[Sync] Remote data merged into local database');
                    // Reload store from merged DB
                    await store.initialize();
                }
            }
        } else {
            // Initial load
            await store.loadFromEncryptedData(remoteDecryptedData);
        }

        // Clear auth error on success
        store.setAuthError(false);
        store.setSyncStatus('synced');

        console.log('Database loaded from Drive successfully');
    } catch (error) {
        console.error('Failed to load from Drive:', error);

        if (error instanceof Error && error.name === 'GDriveAuthError') {
            useLedgerStore.getState().setAuthError(true);
            useLedgerStore.getState().setSyncStatus('error');
        }

        // Fall back to empty database if we haven't loaded anything yet
        if (!useLedgerStore.getState().isInitialized) {
            await useLedgerStore.getState().initialize();
        }
    }
}

/**
 * Save current database to Drive (debounced)
 */
export async function saveToDrive(accessToken: string, userId: string): Promise<void> {
    // Debounce to avoid excessive uploads
    const now: number = Date.now();
    if (syncInProgress || now - lastSyncTime < SYNC_DEBOUNCE_MS) {
        return;
    }

    syncInProgress = true;
    lastSyncTime = now;

    try {
        // Export database
        const store = useLedgerStore.getState();
        const dbExport: Uint8Array = store.exportForSync();

        // Encrypt
        const encryptedData: Uint8Array = await encryptDatabase(dbExport, userId);

        try {
            // Find existing file (requires access token)
            if (!accessToken) {
                throw new Error('No access token available for GDrive sync');
            }

            const clientId = getClientId();
            const deviceName =
                typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown Device';

            // 1. Acquire Lock
            const hasLock = await acquireLock(accessToken, clientId, deviceName);
            if (!hasLock) {
                console.warn('[Sync] Failed to acquire lock, another device is merging...');
                // Refresh lock status so UI shows who has it
                await refreshLockStatus(accessToken);
                store.setSyncStatus('pending-local'); // Keep as pending locally
                return;
            }

            try {
                // 2. Download and Merge Remote before uploading
                const existingFile: Awaited<ReturnType<typeof findDatabaseFile>> =
                    await findDatabaseFile(accessToken);

                let remoteDecrypted: Uint8Array = new Uint8Array();
                if (existingFile) {
                    const remoteEncrypted = await downloadDatabase(accessToken, existingFile.id);
                    try {
                        remoteDecrypted = await decryptDatabase(remoteEncrypted, userId);
                    } catch (decryptError) {
                        console.warn(
                            '[Sync] Decryption failed for existing file. Proceeding with overwrite.',
                            decryptError,
                        );
                        // Remote exists but cannot be decrypted (key mismatch).
                        // We'll treat this as "no remote to merge" and upload our local state.
                    }
                }

                // Only merge if we actually got remote data
                if (remoteDecrypted.byteLength > 0) {
                    const remoteDb = await createIsolatedDatabase(remoteDecrypted);
                    const localDb = getDb();

                    if (localDb) {
                        const merged = await SQLiteMergeEngine.mergeRemoteIntoLocal(
                            remoteDb,
                            localDb,
                        );
                        if (merged) {
                            console.log('[Sync] Remote changes merged before upload');
                            // Refresh store data to reflect merged state
                            await store.initialize();
                        }
                    }
                }

                // 3. Export merged local and upload
                const dbExportFinal: Uint8Array = store.exportForSync();
                const finalEncrypted: Uint8Array = await encryptDatabase(dbExportFinal, userId);

                await uploadDatabase(accessToken, finalEncrypted, existingFile?.id);

                // Success! Clear dirty flag and auth error
                store.setDirty(false);
                store.setAuthError(false);
                store.setSyncStatus('synced');

                // Also clear local fallback if we just successfully synced
                await clearLocalFallback();
                store.setHasLocalFallback(false);

                console.log('Database saved to Drive successfully');
            } finally {
                // 4. Release Lock
                await releaseLock(accessToken);
                store.setLockStatus(null);
            }
        } catch (driveError) {
            // If it's an auth error or no token, save to local fallback
            const isAuthError =
                (driveError instanceof Error && driveError.name === 'GDriveAuthError') ||
                !accessToken;

            if (isAuthError) {
                console.warn('[Sync] Session expired or missing, saving to local fallback...');
                await saveLocalFallback(encryptedData);
                store.setAuthError(true);
                store.setSyncStatus('pending-local');
                store.setHasLocalFallback(true);
            } else {
                store.setSyncStatus('error');
                throw driveError;
            }
        }
    } catch (error) {
        console.error('Failed to save to Drive:', error);
        throw error;
    } finally {
        syncInProgress = false;
    }
}

/**
 * Refresh current lock status from Drive
 */
export async function refreshLockStatus(accessToken: string): Promise<void> {
    const store = useLedgerStore.getState();
    if (!accessToken) {
        store.setLockStatus(null);
        return;
    }

    try {
        const lock = await getLockStatus(accessToken);
        store.setLockStatus(lock);
    } catch (error) {
        if (error instanceof GDriveAuthError) {
            console.warn('[Sync] GDrive session expired during lock refresh.');
            return;
        }
        console.error('[Sync] Failed to refresh lock status:', error);
    }
}

/**
 * Forcibly release the sync lock
 */
export async function forceReleaseSyncLock(accessToken: string): Promise<void> {
    if (!accessToken) return;
    try {
        await driveForceReleaseLock(accessToken);
        useLedgerStore.getState().setLockStatus(null);
    } catch (error) {
        console.error('[Sync] Failed to force release lock:', error);
        throw error;
    }
}

/**
 * Get sync status
 */
export function getSyncStatus(): ISyncStatus {
    return {
        inProgress: syncInProgress,
        lastSyncTime,
    } satisfies ISyncStatus;
}
