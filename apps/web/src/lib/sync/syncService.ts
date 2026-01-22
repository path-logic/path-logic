import { useLedgerStore } from '@/store/ledgerStore';
import { encryptDatabase, decryptDatabase } from '@/lib/crypto/encryption';
import {
    findDatabaseFile,
    downloadDatabase,
    uploadDatabase,
} from '@/lib/storage/GoogleDriveAdapter';

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
export async function loadFromDrive(
    accessToken: string,
    userId: string
): Promise<void> {
    try {
        // Find the database file in Drive
        const file: Awaited<ReturnType<typeof findDatabaseFile>> = await findDatabaseFile(accessToken);

        if (!file) {
            // No existing database, initialize empty
            console.log('No existing database found, initializing empty database');
            await useLedgerStore.getState().initialize();
            return;
        }

        // Download encrypted database
        const encryptedData: Uint8Array = await downloadDatabase(accessToken, file.id);

        // Decrypt
        const decryptedData: Uint8Array = await decryptDatabase(encryptedData, userId);

        // Load into SQLite
        await useLedgerStore.getState().loadFromEncryptedData(decryptedData);

        // Clear auth error on success
        useLedgerStore.getState().setAuthError(false);

        console.log('Database loaded from Drive successfully');
    } catch (error) {
        console.error('Failed to load from Drive:', error);

        if (error instanceof Error && error.name === 'GDriveAuthError') {
            useLedgerStore.getState().setAuthError(true);
        }

        // Fall back to empty database
        await useLedgerStore.getState().initialize();
    }
}

/**
 * Save current database to Drive (debounced)
 */
export async function saveToDrive(
    accessToken: string,
    userId: string
): Promise<void> {
    // Debounce to avoid excessive uploads
    const now: number = Date.now();
    if (syncInProgress || now - lastSyncTime < SYNC_DEBOUNCE_MS) {
        return;
    }

    syncInProgress = true;
    lastSyncTime = now;

    try {
        // Export database
        const dbExport: Uint8Array = useLedgerStore.getState().exportForSync();

        // Encrypt
        const encryptedData: Uint8Array = await encryptDatabase(dbExport, userId);

        // Find existing file
        const existingFile: Awaited<ReturnType<typeof findDatabaseFile>> = await findDatabaseFile(accessToken);

        // Upload (create or update)
        await uploadDatabase(
            accessToken,
            encryptedData,
            existingFile?.id
        );

        // Success! Clear dirty flag and auth error
        useLedgerStore.getState().setDirty(false);
        useLedgerStore.getState().setAuthError(false);

        console.log('Database saved to Drive successfully');
    } catch (error) {
        console.error('Failed to save to Drive:', error);

        if (error instanceof Error && error.name === 'GDriveAuthError') {
            useLedgerStore.getState().setAuthError(true);
        }

        throw error;
    } finally {
        syncInProgress = false;
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
