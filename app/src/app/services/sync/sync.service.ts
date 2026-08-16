import type { WritableSignal } from '@angular/core';
import { inject, Injectable, signal } from '@angular/core';

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
import {
    getLastDriveSyncTime,
    loadLocalSnapshot,
    saveLastDriveSyncTime,
    saveLocalSnapshot
} from '../../lib/storage/LocalPersistenceAdapter';
import { getDb } from '../../lib/storage/SQLiteAdapter';
import type { IMergeResult } from '../../lib/sync/MergeEngine';
import { SQLiteMergeEngine } from '../../lib/sync/MergeEngine';
import { AuthService } from '../auth/auth.service';
import { LedgerStore } from '../ledger-store/ledger.store';
import { PostHogService } from '../posthog/posthog.service';

interface ISyncStatus {
    inProgress: boolean;
    lastSyncTime: number;
}

const SYNC_DEBOUNCE_MS: number = 2000;

/**
 * SyncService — Local-First Architecture
 *
 * IndexedDB is the primary data store. Google Drive is the background
 * cloud backup. The app is always instantly usable from local storage.
 *
 * ## Startup sequence (called from AppComponent):
 *
 *   1. initFromLocal(userId)
 *      → Load IndexedDB snapshot → decrypt → SQL.js → app is usable
 *      → Returns true if local data existed, false if new device
 *
 *   2a. If local data existed:
 *      → syncFromDrive() runs in the BACKGROUND (no await)
 *      → Downloads Drive version, compares timestamps
 *      → If Drive is newer: merge + update IndexedDB
 *      → If local is newer: upload local to Drive
 *
 *   2b. If NO local data (new device):
 *      → syncFromDrive() runs with await (blocking)
 *      → Shows "Syncing your Ledger" screen
 *      → Downloads Drive data, writes to IndexedDB, app becomes usable
 *
 * ## Write path (every mutation):
 *   LedgerStore.mutate() → SQL.js → commitToLocal() (IndexedDB, immediate)
 *                        → isDirty = true → auto-save → saveToDrive() (background)
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
    private syncInProgress: boolean = false;
    private lastSyncTime: number = 0;

    readonly isSyncing: WritableSignal<boolean> = signal<boolean>(false);

    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);
    private readonly posthogService: PostHogService = inject(PostHogService);

    // ── Startup: Step 1 — Load from IndexedDB ────────────────────────────────

    /**
     * Load the local IndexedDB snapshot and hydrate the store.
     * This is always the FIRST step on startup — instant, no network.
     *
     * Sets userId on the LedgerStore so commitToLocal() can encrypt.
     *
     * @returns true if local data was found and loaded, false if new device.
     */
    async initFromLocal(userId: string): Promise<boolean> {
        this.ledgerStore.userId = userId;
        this.ledgerStore.isLoading.set(true);

        try {
            const snapshot = await loadLocalSnapshot();

            if (snapshot) {
                const decrypted = await decryptDatabase(snapshot.encryptedData, userId);
                await this.ledgerStore.loadFromEncryptedData(decrypted);
                this.ledgerStore.hasLocalFallback.set(true);
                console.info(
                    `[Sync] Loaded local snapshot (version: ${new Date(snapshot.version).toISOString()})`
                );
                return true;
            } else {
                console.info('[Sync] No local snapshot — new device or first install.');
                return false;
            }
        } catch (err: unknown) {
            console.error('[Sync] Failed to load local snapshot:', err);
            return false;
        } finally {
            this.ledgerStore.isLoading.set(false);
        }
    }

    // ── Startup: Step 2 — Background Drive sync ───────────────────────────────

    /**
     * Background Drive sync — compares local version with Drive and
     * reconciles differences. Safe to call without await after initFromLocal().
     *
     * If no Drive token is available, sets authError and returns.
     * The sync-pending banner will prompt the user to re-authenticate.
     */
    async syncFromDrive(): Promise<void> {
        const accessToken = this.authService.accessToken();
        const userId = this.authService.userId();

        if (!accessToken || !userId) {
            // No Drive token — local-only mode
            this.ledgerStore.authError.set(true);
            this.ledgerStore.syncStatus.set('pending-local');

            // Ensure the DB is initialized even without Drive
            if (!this.ledgerStore.isInitialized()) {
                await this.ledgerStore.initialize();
            }
            return;
        }

        this.isSyncing.set(true);

        try {
            const driveFile: IDriveFile | null = await findDatabaseFile(accessToken);

            if (!driveFile) {
                // No Drive file — this is a fresh install or Drive was cleared.
                // Upload local state (if any) or just mark as synced.
                if (this.ledgerStore.isInitialized()) {
                    await this.uploadToDrive(accessToken, userId, null);
                } else {
                    // Truly fresh start — no local AND no Drive
                    await this.ledgerStore.initialize();
                    this.ledgerStore.syncStatus.set('synced');
                    this.posthogService.posthog.capture('data_loaded_from_drive', {
                        source: 'fresh_start',
                        is_returning_user: false
                    });
                }
                return;
            }

            // Drive file exists — compare timestamps against the last successful Drive sync time on this device
            const lastSyncTime = getLastDriveSyncTime();
            const driveModifiedMs = new Date(driveFile.modifiedTime ?? 0).getTime();

            if (driveModifiedMs > lastSyncTime) {
                // Drive is newer than our last sync timestamp — download, decrypt, merge
                await this.downloadAndMerge(accessToken, userId, driveFile);
            } else {
                // Local is up to date with or newer than Drive — upload if dirty
                if (this.ledgerStore.isDirty()) {
                    await this.uploadToDrive(accessToken, userId, driveFile.id);
                } else {
                    this.ledgerStore.syncStatus.set('synced');
                }
            }
        } catch (error: unknown) {
            if (error instanceof GDriveAuthError) {
                this.ledgerStore.authError.set(true);
                this.ledgerStore.syncStatus.set('pending-local');
            } else {
                console.error('[Sync] syncFromDrive failed:', error);
                this.ledgerStore.syncStatus.set('error');
                this.ledgerStore.syncError.set(
                    error instanceof Error ? error.message : 'Unknown sync error'
                );
            }
        } finally {
            this.isSyncing.set(false);
        }
    }

    // ── Mutations: Save dirty state to Drive ──────────────────────────────────

    private debouncedSaveTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Save current database to Drive (debounced, with lock + merge).
     * Called by AppComponent's auto-save effect after mutations.
     *
     * @param forceImmediate If true, bypasses the SYNC_DEBOUNCE_MS rate limit check.
     */
    async saveToDrive(forceImmediate = false): Promise<void> {
        const accessToken: string | null = this.authService.accessToken();
        const userId: string | null = this.authService.userId();
        if (!accessToken || !userId) return;

        const now: number = Date.now();
        if (!forceImmediate && now - this.lastSyncTime < SYNC_DEBOUNCE_MS) {
            if (this.debouncedSaveTimer === null) {
                const remaining = SYNC_DEBOUNCE_MS - (now - this.lastSyncTime);
                this.debouncedSaveTimer = setTimeout(() => {
                    this.debouncedSaveTimer = null;
                    void this.saveToDrive(true);
                }, remaining);
            }
            return;
        }

        if (this.syncInProgress) return;

        this.syncInProgress = true;
        this.isSyncing.set(true);
        this.ledgerStore.syncStatus.set('uploading');

        try {
            const clientId: string = this.getClientId();

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
                // Check for remote changes and merge before uploading
                const driveFile: IDriveFile | null = await findDatabaseFile(accessToken);
                if (driveFile) {
                    const remoteEncrypted = await downloadDatabase(accessToken, driveFile.id);
                    const remoteDecrypted = await decryptDatabase(remoteEncrypted, userId);

                    const localDb = getDb();
                    if (localDb) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const SQL: any = (localDb as any).constructor;
                        // SQL is the Database class itself — instantiate directly
                        const remoteDb = new SQL(remoteDecrypted);
                        try {
                            const lastSyncTime = getLastDriveSyncTime();
                            const mergeResult: IMergeResult =
                                await SQLiteMergeEngine.mergeRemoteIntoLocal(
                                    remoteDb,
                                    localDb,
                                    lastSyncTime
                                );
                            if (mergeResult.mergedCount > 0 || mergeResult.conflicts.length > 0) {
                                this.ledgerStore.syncStatus.set('merging');
                                await this.ledgerStore.loadFromEncryptedData(
                                    new Uint8Array(localDb.export())
                                );
                                this.ledgerStore.mergeCount.set(mergeResult.mergedCount);
                                if (mergeResult.conflicts.length > 0) {
                                    this.ledgerStore.syncConflicts.set(mergeResult.conflicts);
                                }
                            }
                        } finally {
                            remoteDb.close();
                        }
                    }
                }

                // Export, encrypt, upload
                await this.uploadToDrive(accessToken, userId, driveFile?.id ?? null);
                this.lastSyncTime = Date.now();
            } finally {
                await releaseLock(accessToken);
            }
        } catch (error: unknown) {
            if (error instanceof GDriveAuthError) {
                this.ledgerStore.authError.set(true);
                this.ledgerStore.syncStatus.set('pending-local');
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

    // ── Utility methods ───────────────────────────────────────────────────────

    async refreshLockStatus(): Promise<void> {
        const accessToken = this.authService.accessToken();
        if (!accessToken) return;
        try {
            const status = await getLockStatus(accessToken);
            this.ledgerStore.lockStatus.set(status);
        } catch (error) {
            console.error('[Sync] Failed to refresh lock status:', error);
        }
    }

    async forceReleaseSyncLock(): Promise<void> {
        const accessToken = this.authService.accessToken();
        if (!accessToken) return;
        try {
            await forceReleaseLock(accessToken);
            this.ledgerStore.lockStatus.set(null);
            this.ledgerStore.syncError.set(null);
        } catch (error) {
            console.error('[Sync] Failed to force release lock:', error);
        }
    }

    async flushPendingUpload(): Promise<void> {
        if (this.debouncedSaveTimer !== null) {
            clearTimeout(this.debouncedSaveTimer);
            this.debouncedSaveTimer = null;
        }
        return this.saveToDrive(true);
    }

    getSyncStatus(): ISyncStatus {
        return { inProgress: this.syncInProgress, lastSyncTime: this.lastSyncTime };
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async downloadAndMerge(
        accessToken: string,
        userId: string,
        driveFile: IDriveFile
    ): Promise<void> {
        this.ledgerStore.syncStatus.set('downloading');

        const encryptedData = await downloadDatabase(accessToken, driveFile.id);
        const decryptedData = await decryptDatabase(encryptedData, userId);

        if (!this.ledgerStore.isInitialized()) {
            // New device — load Drive data directly (no merge needed)
            await this.ledgerStore.loadFromEncryptedData(decryptedData);
            await saveLocalSnapshot(encryptedData, Date.now());
            this.ledgerStore.hasLocalFallback.set(true);
            this.ledgerStore.syncStatus.set('synced');
            this.ledgerStore.isDirty.set(false);
            saveLastDriveSyncTime(Date.now());
            this.posthogService.posthog.capture('data_loaded_from_drive', {
                source: 'drive',
                is_returning_user: true
            });
            return;
        }

        // Existing device — merge Drive into local
        this.ledgerStore.syncStatus.set('merging');
        const localDb = getDb();
        if (localDb) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SQL: any = (localDb as any).constructor;
            // SQL is the Database class itself — instantiate directly
            const remoteDb = new SQL(decryptedData);
            try {
                const lastSyncTime = getLastDriveSyncTime();
                const mergeResult: IMergeResult = await SQLiteMergeEngine.mergeRemoteIntoLocal(
                    remoteDb,
                    localDb,
                    lastSyncTime
                );
                if (mergeResult.mergedCount > 0 || mergeResult.conflicts.length > 0) {
                    await this.ledgerStore.loadFromEncryptedData(new Uint8Array(localDb.export()));
                    this.ledgerStore.mergeCount.set(mergeResult.mergedCount);
                    if (mergeResult.conflicts.length > 0) {
                        this.ledgerStore.syncConflicts.set(mergeResult.conflicts);
                    }
                    this.posthogService.posthog.capture('data_merged_from_drive', {
                        merge_count: mergeResult.mergedCount,
                        conflict_count: mergeResult.conflicts.length
                    });
                }
            } finally {
                remoteDb.close();
            }
        }

        // Upload merged result back to Drive
        await this.uploadToDrive(accessToken, userId, driveFile.id);
    }

    private async uploadToDrive(
        accessToken: string,
        userId: string,
        driveFileId: string | null
    ): Promise<void> {
        this.ledgerStore.syncStatus.set('uploading');
        const dbExport = this.ledgerStore.exportForSync();
        const encrypted = await encryptDatabase(dbExport, userId);
        await uploadDatabase(accessToken, encrypted, driveFileId ?? undefined);
        const now = Date.now();
        await saveLocalSnapshot(encrypted, now);
        saveLastDriveSyncTime(now);
        this.ledgerStore.hasLocalFallback.set(true);
        this.ledgerStore.syncStatus.set('synced');
        this.ledgerStore.isDirty.set(false);
        this.ledgerStore.syncError.set(null);
    }

    private getClientId(): string {
        let clientId = localStorage.getItem('path-logic-client-id');
        if (!clientId) {
            clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('path-logic-client-id', clientId);
        }
        return clientId;
    }
}
