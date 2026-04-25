import type { WritableSignal } from '@angular/core';
import { inject, Injectable, signal } from '@angular/core';
import type { Database } from 'sql.js';

import { decryptDatabase, encryptDatabase } from '../../lib/crypto/encryption';
import { GDriveAuthError } from '../../lib/storage/errors';
import {
    acquireLock,
    downloadDatabase,
    findDatabaseFile,
    forceReleaseLock,
    getLockStatus,
    type IDriveFile,
    releaseLock,
    uploadDatabase
} from '../../lib/storage/GoogleDriveAdapter';
import { loadLocalFallback, saveLocalFallback } from '../../lib/storage/LocalPersistenceAdapter';
import { getDb } from '../../lib/storage/SQLiteAdapter';
import { SQLiteMergeEngine } from '../../lib/sync/MergeEngine';
import { AuthService } from '../auth/auth.service';
import { LedgerStore } from '../ledger-store/ledger.store';
import { PostHogService } from '../posthog/posthog.service';

/**
 * Sync status information
 */
interface ISyncStatus {
    inProgress: boolean;
    lastSyncTime: number;
}

const SYNC_DEBOUNCE_MS: number = 2000;

/**
 * Angular service that orchestrates the full sync pipeline:
 * SQLite → Export → Encrypt → Upload to Drive
 * Drive → Download → Decrypt → Load into SQLite
 *
 * Orchestrates the full sync pipeline:
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
    private syncInProgress: boolean = false;
    private lastSyncTime: number = 0;

    readonly isSyncing: WritableSignal<boolean> = signal<boolean>(false);

    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);
    private readonly posthogService: PostHogService = inject(PostHogService);

    /**
     * Pull encrypted DB from Google Drive, decrypt, and load into the store.
     * Falls back to local IndexedDB cache if Drive is unavailable.
     */
    async loadFromDrive(): Promise<void> {
        const accessToken: string | null = this.authService.accessToken();
        const userId: string | null = this.authService.userId();
        if (!accessToken || !userId) {
            console.warn('[Sync] No access token or user ID — cannot load from Drive');
            return;
        }

        this.isSyncing.set(true);
        this.ledgerStore.syncStatus.set('pending-local');

        try {
            const driveFile: IDriveFile | null = await findDatabaseFile(accessToken);

            if (driveFile) {
                const encryptedData: Uint8Array = await downloadDatabase(accessToken, driveFile.id);
                const decryptedData: Uint8Array = await decryptDatabase(encryptedData, userId);
                await this.ledgerStore.loadFromEncryptedData(decryptedData);

                // Save a local fallback copy
                await saveLocalFallback(encryptedData);
                this.ledgerStore.hasLocalFallback.set(true);
                this.ledgerStore.syncStatus.set('synced');
                this.ledgerStore.isDirty.set(false);
                this.posthogService.posthog.capture('data_loaded_from_drive', {
                    source: 'drive',
                    is_returning_user: true
                });
            } else {
                // No cloud file — try local fallback
                const localData: Uint8Array | null = await loadLocalFallback();
                if (localData) {
                    const decryptedData: Uint8Array = await decryptDatabase(localData, userId);
                    await this.ledgerStore.loadFromEncryptedData(decryptedData);
                    this.ledgerStore.hasLocalFallback.set(true);
                    this.ledgerStore.syncStatus.set('pending-local');
                    this.posthogService.posthog.capture('data_loaded_from_drive', {
                        source: 'local_fallback',
                        is_returning_user: true
                    });
                } else {
                    // Fresh start
                    await this.ledgerStore.initialize();
                    this.ledgerStore.syncStatus.set('synced');
                    this.posthogService.posthog.capture('data_loaded_from_drive', {
                        source: 'fresh_start',
                        is_returning_user: false
                    });
                }
            }
        } catch (error: unknown) {
            if (error instanceof GDriveAuthError) {
                this.ledgerStore.authError.set(true);
                // Try local fallback
                const localData: Uint8Array | null = await loadLocalFallback();
                if (localData) {
                    const decryptedData: Uint8Array = await decryptDatabase(localData, userId);
                    await this.ledgerStore.loadFromEncryptedData(decryptedData);
                    this.ledgerStore.hasLocalFallback.set(true);
                }
            } else {
                console.error('[Sync] Failed to load from Drive:', error);
                this.ledgerStore.syncStatus.set('error');
                this.ledgerStore.syncError.set(
                    error instanceof Error ? error.message : 'Unknown error'
                );
                this.posthogService.posthog.capture('sync_failed', {
                    operation: 'load',
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        } finally {
            this.isSyncing.set(false);
        }
    }

    /**
     * Save current database to Drive (with debounce, lock, merge, encrypt).
     */
    async saveToDrive(): Promise<void> {
        const accessToken: string | null = this.authService.accessToken();
        const userId: string | null = this.authService.userId();
        if (!accessToken || !userId) return;

        // Debounce
        const now: number = Date.now();
        if (now - this.lastSyncTime < SYNC_DEBOUNCE_MS) return;
        if (this.syncInProgress) return;

        this.syncInProgress = true;
        this.isSyncing.set(true);
        this.ledgerStore.syncStatus.set('pending-local');

        try {
            const clientId: string = this.getClientId();

            // Acquire lock
            const lockAcquired: boolean = await acquireLock(
                accessToken,
                clientId,
                navigator.userAgent
            );
            if (!lockAcquired) {
                console.warn('[Sync] Could not acquire lock — another device is syncing');
                this.ledgerStore.syncStatus.set('error');
                this.ledgerStore.syncError.set('Another device is currently syncing');
                return;
            }

            try {
                // Check for remote changes and merge
                const driveFile: IDriveFile | null = await findDatabaseFile(accessToken);
                if (driveFile) {
                    const remoteEncrypted: Uint8Array = await downloadDatabase(
                        accessToken,
                        driveFile.id
                    );
                    const remoteDecrypted: Uint8Array = await decryptDatabase(
                        remoteEncrypted,
                        userId
                    );

                    // Load remote DB into temp instance and merge
                    const localDb: Database | null = getDb();
                    if (localDb) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const SQL: any = (localDb as any).constructor;
                        const remoteDb: Database = new SQL.Database(remoteDecrypted);
                        try {
                            const hadChanges: boolean =
                                await SQLiteMergeEngine.mergeRemoteIntoLocal(remoteDb, localDb);
                            if (hadChanges) {
                                // Refresh store from merged DB
                                await this.ledgerStore.initialize();
                            }
                        } finally {
                            remoteDb.close();
                        }
                    }
                }

                // Export, encrypt, upload
                const dbExport: Uint8Array = this.ledgerStore.exportForSync();
                const encrypted: Uint8Array = await encryptDatabase(dbExport, userId);
                await uploadDatabase(accessToken, encrypted, driveFile?.id);

                // Save local fallback
                await saveLocalFallback(encrypted);
                this.ledgerStore.hasLocalFallback.set(true);
                this.ledgerStore.syncStatus.set('synced');
                this.ledgerStore.isDirty.set(false);
                this.ledgerStore.syncError.set(null);
                this.lastSyncTime = Date.now();
                this.posthogService.posthog.capture('sync_completed', {
                    operation: 'save'
                });
            } finally {
                await releaseLock(accessToken);
            }
        } catch (error: unknown) {
            if (error instanceof GDriveAuthError) {
                this.ledgerStore.authError.set(true);
            } else {
                console.error('[Sync] Failed to save to Drive:', error);
                this.ledgerStore.syncStatus.set('error');
                this.ledgerStore.syncError.set(
                    error instanceof Error ? error.message : 'Unknown error'
                );
                this.posthogService.posthog.capture('sync_failed', {
                    operation: 'save',
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        } finally {
            this.syncInProgress = false;
            this.isSyncing.set(false);
        }
    }

    /**
     * Refresh lock status from Drive.
     */
    async refreshLockStatus(): Promise<void> {
        const accessToken: string | null = this.authService.accessToken();
        if (!accessToken) return;

        try {
            const status = await getLockStatus(accessToken);
            this.ledgerStore.lockStatus.set(status);
        } catch (error: unknown) {
            console.error('[Sync] Failed to refresh lock status:', error);
        }
    }

    /**
     * Force release the sync lock.
     */
    async forceReleaseSyncLock(): Promise<void> {
        const accessToken: string | null = this.authService.accessToken();
        if (!accessToken) return;

        try {
            await forceReleaseLock(accessToken);
            this.ledgerStore.lockStatus.set(null);
            this.ledgerStore.syncError.set(null);
        } catch (error: unknown) {
            console.error('[Sync] Failed to force release lock:', error);
        }
    }

    /**
     * Get sync status snapshot.
     */
    getSyncStatus(): ISyncStatus {
        return {
            inProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime
        };
    }

    /**
     * Get or create a stable client ID for this browser.
     */
    private getClientId(): string {
        let clientId: string | null = localStorage.getItem('path-logic-client-id');
        if (!clientId) {
            clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('path-logic-client-id', clientId);
        }
        return clientId;
    }
}
