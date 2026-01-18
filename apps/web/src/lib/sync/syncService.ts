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

let syncInProgress = false;
let lastSyncTime = 0;
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
        const file = await findDatabaseFile(accessToken);

        if (!file) {
            // No existing database, initialize empty
            console.log('No existing database found, initializing empty database');
            await useLedgerStore.getState().initialize();
            return;
        }

        // Download encrypted database
        const encryptedData = await downloadDatabase(accessToken, file.id);

        // Decrypt
        const decryptedData = await decryptDatabase(encryptedData, userId);

        // Load into SQLite
        await useLedgerStore.getState().loadFromEncryptedData(decryptedData);

        console.log('Database loaded from Drive successfully');
    } catch (error) {
        console.error('Failed to load from Drive:', error);
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
    const now = Date.now();
    if (syncInProgress || now - lastSyncTime < SYNC_DEBOUNCE_MS) {
        return;
    }

    syncInProgress = true;
    lastSyncTime = now;

    try {
        // Export database
        const dbExport = useLedgerStore.getState().exportForSync();

        // Encrypt
        const encryptedData = await encryptDatabase(dbExport, userId);

        // Find existing file
        const existingFile = await findDatabaseFile(accessToken);

        // Upload (create or update)
        await uploadDatabase(
            accessToken,
            encryptedData,
            existingFile?.id
        );

        console.log('Database saved to Drive successfully');
    } catch (error) {
        console.error('Failed to save to Drive:', error);
        throw error;
    } finally {
        syncInProgress = false;
    }
}

/**
 * Get sync status
 */
export function getSyncStatus(): {
    inProgress: boolean;
    lastSyncTime: number;
} {
    return {
        inProgress: syncInProgress,
        lastSyncTime,
    };
}
