import { useLedgerStore } from '@/store/ledgerStore';
import { encryptDatabase, decryptDatabase } from '@/lib/crypto/encryption';
import {
    type IDriveFile,
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
/**
 * Pulls the encrypted database from Google Drive, decrypts it, and loads it into the store.
 * If no cloud file is found, it initializes from the local fallback.
 */
export async function loadFromDrive(accessToken: string, userId: string): Promise<void> {
    const store = useLedgerStore.getState();
    const appEnv = process.env['NEXT_PUBLIC_APP_ENV'] || 'development';

    console.log('[Sync] Starting loadFromDrive sequence...', {
        env: appEnv,
        hasToken: !!accessToken,
        userId: userId === 'anonymous' ? 'NONE' : userId,
    });

    try {
        let encryptedData: Uint8Array | null = null;
        let isFromDrive = false;

        // 1. Check Google Drive if authenticated
        if (accessToken && userId !== 'anonymous') {
            console.log('[Sync] Attempting to find ledger on Google Drive...');
            const file: IDriveFile | null = await findDatabaseFile(accessToken);
            if (file) {
                console.log('[Sync] Found remote file, downloading...', { fileId: file.id });
                encryptedData = await downloadDatabase(accessToken, file.id);
                isFromDrive = true;
            } else {
                console.log('[Sync] No remote file found.');
            }
        }

        // 2. Fallback to LocalPersistence if no Drive data found
        if (!encryptedData) {
            console.log('[Sync] Checking local browser persistence fallback...');
            encryptedData = await loadLocalFallback();
            if (encryptedData) {
                console.log('[Sync] Found local fallback data.');
                store.setHasLocalFallback(true);
            }
        }

        // 3. Decrypt and Load
        if (encryptedData) {
            console.log('[Sync] Decrypting payload...');
            let remoteDecryptedData: Uint8Array;
            try {
                remoteDecryptedData = await decryptDatabase(encryptedData, userId);
            } catch (decryptError) {
                const isOperationError =
                    decryptError instanceof Error && decryptError.name === 'OperationError';
                const logMethod = isOperationError ? 'warn' : 'error';

                console[logMethod](
                    `[Sync] ${isOperationError ? 'Handled' : 'Failed'} decryption attempt. Possible key mismatch between environments or corrupted data.`,
                    decryptError,
                );
                // Clear state to avoid infinite loops or corrupted state
                store.setSyncStatus('error');
                store.setSyncError(
                    'Decryption Failed: The database could not be unlocked. This usually happens if the data was created with a different key or is corrupted.',
                );

                // CRITICAL: If we failed to decrypt but aren't initialized, we MUST initialize anyway
                // to avoid getting stuck in a loading state. The user can then use Maintenance tools.
                if (!store.isInitialized) {
                    await store.initialize();
                }
                return;
            }

            // If we have local data, merge. Otherwise just load.
            if (store.isInitialized) {
                console.log('[Sync] Database already initialized, merging data...');
                const remoteDb = await createIsolatedDatabase(remoteDecryptedData);
                const localDb = getDb();

                if (localDb) {
                    const changed = await SQLiteMergeEngine.mergeRemoteIntoLocal(remoteDb, localDb);
                    if (changed) {
                        console.log('[Sync] Data merged into local database');
                        // Reload store from merged DB
                        await store.initialize();
                    }
                }
            } else {
                console.log('[Sync] Loading data into store...');
                await store.loadFromEncryptedData(remoteDecryptedData);
            }

            if (isFromDrive) {
                console.log('[Sync] Cloud data loaded successfully.');
                lastSyncTime = Date.now();
                store.setSyncStatus('synced');
                store.setSyncError(null);
            } else {
                console.log('[Sync] Local data loaded, cloud sync pending.');
                store.setSyncStatus('pending-local');
            }
        } else {
            console.log('[Sync] No persistent data found. Initializing fresh workspace.');
            await store.initialize();
        }

        // Clear any previous auth errors
        store.setAuthError(false);
    } catch (error) {
        const isAuthError =
            error instanceof GDriveAuthError ||
            (error instanceof Error && error.name === 'GDriveAuthError');

        if (isAuthError) {
            console.warn(
                '[Sync] Load sequence failed (Auth):',
                error instanceof Error ? error.message : 'Session expired',
            );
        } else {
            console.error('[Sync] Load sequence failed:', error);
        }

        if (isAuthError) {
            store.setAuthError(true);
            store.setSyncStatus('error');
            store.setSyncError('Google Drive Authentication Failed');
        } else {
            store.setSyncStatus('error');
            store.setSyncError(error instanceof Error ? error.message : 'Unknown Sync Error');
        }

        // Fall back to empty database if we haven't loaded anything yet
        if (!store.isInitialized) {
            await store.initialize();
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

    console.log('[Sync] Starting saveToDrive sequence...', { hasToken: !!accessToken, userId });

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
            console.log('[Sync] Attempting to acquire cloud lock...');
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
                console.log('[Sync] Searching for existing remote file...');
                const existingFile: Awaited<ReturnType<typeof findDatabaseFile>> =
                    await findDatabaseFile(accessToken);

                let remoteDecrypted: Uint8Array = new Uint8Array();
                if (existingFile) {
                    console.log('[Sync] Remote file found, checking for merge needs...', {
                        modifiedTime: existingFile.modifiedTime,
                    });
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
                } else {
                    console.log('[Sync] No remote file found, will create new.');
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
                console.log('[Sync] Exporting and encrypting local database...');
                const dbExportFinal: Uint8Array = store.exportForSync();
                const finalEncrypted: Uint8Array = await encryptDatabase(dbExportFinal, userId);

                console.log('[Sync] Uploading to Google Drive...', {
                    bytes: finalEncrypted.length,
                });
                await uploadDatabase(accessToken, finalEncrypted, existingFile?.id);

                // Success! Clear dirty flag and auth error
                console.log('[Sync] Cloud sync SUCCESSFUL. Clearing dirty state.');
                store.setDirty(false);
                store.setAuthError(false);
                store.setSyncStatus('synced');

                // Also clear local fallback if we just successfully synced
                await clearLocalFallback();
                store.setHasLocalFallback(false);
            } finally {
                // 4. Release Lock
                console.log('[Sync] Releasing cloud lock.');
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
        if (
            error instanceof GDriveAuthError ||
            (error instanceof Error && error.name === 'GDriveAuthError')
        ) {
            console.warn('[Sync] Failed to force release lock (Auth):', error.message);
        } else {
            console.error('[Sync] Failed to force release lock:', error);
        }
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
