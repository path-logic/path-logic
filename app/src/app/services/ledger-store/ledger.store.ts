import type { WritableSignal } from '@angular/core';
import { Injectable, signal } from '@angular/core';
import type {
    IAccount,
    ICategory,
    IParsedTransaction,
    IPayee,
    IRecurringSchedule,
    ISODateString,
    ITransaction
} from '@core';

import { encryptDatabase } from '../../lib/crypto/encryption';
import type { ILockStatus } from '../../lib/storage/GoogleDriveAdapter';
import { saveLocalSnapshot } from '../../lib/storage/LocalPersistenceAdapter';
import {
    deleteRecurringSchedule,
    deleteTransaction,
    exportDatabase,
    getAllAccounts,
    getAllCategories,
    getAllPayees,
    getAllRecurringSchedules,
    getAllTransactions,
    getDb,
    getPayeeByName,
    initDatabase,
    insertAccount,
    insertPayee,
    insertRecurringSchedule,
    insertTransaction,
    insertTransactions,
    loadDatabase,
    resetDatabase,
    softDeleteAccountCascade,
    updateAccount,
    updatePayee,
    updateRecurringSchedule,
    updateTransaction
} from '../../lib/storage/SQLiteAdapter';
import type { ITransactionConflict } from '../../lib/sync/MergeEngine';
import {
    type IReconciliationMatch,
    ReconciliationEngine
} from '../../lib/sync/ReconciliationEngine';

/**
 * Sync status values:
 *   synced        — local and Drive are in sync
 *   uploading     — writing local snapshot to Drive
 *   downloading   — fetching Drive snapshot (new device or Drive is newer)
 *   merging       — merge engine running after download
 *   pending-local — no Drive token; data is local-only
 *   error         — Drive operation failed
 */
export type SyncStatus =
    | 'synced'
    | 'uploading'
    | 'downloading'
    | 'merging'
    | 'pending-local'
    | 'error';

/**
 * Angular signal-based ledger store.
 * Replaces the Zustand `useLedgerStore` with Angular signals.
 *
 * All state is reactive via signals. Mutations happen through methods
 * that write to SQLite, then immediately commit to IndexedDB, then
 * set isDirty to trigger background Drive upload.
 */
@Injectable({ providedIn: 'root' })
export class LedgerStore {
    // --- State signals ---
    readonly transactions: WritableSignal<Array<ITransaction>> = signal<Array<ITransaction>>([]);
    readonly accounts: WritableSignal<Array<IAccount>> = signal<Array<IAccount>>([]);
    readonly payees: WritableSignal<Array<IPayee>> = signal<Array<IPayee>>([]);
    readonly categories: WritableSignal<Array<ICategory>> = signal<Array<ICategory>>([]);
    readonly schedules: WritableSignal<Array<IRecurringSchedule>> = signal<
        Array<IRecurringSchedule>
    >([]);
    readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);
    readonly isInitialized: WritableSignal<boolean> = signal<boolean>(false);
    readonly authError: WritableSignal<boolean> = signal<boolean>(false);
    readonly isDirty: WritableSignal<boolean> = signal<boolean>(false);
    readonly syncStatus: WritableSignal<SyncStatus> = signal<SyncStatus>('synced');
    readonly syncError: WritableSignal<string | null> = signal<string | null>(null);
    readonly hasLocalFallback: WritableSignal<boolean> = signal<boolean>(false);
    readonly lockStatus: WritableSignal<ILockStatus | null> = signal<ILockStatus | null>(null);
    /** Number of transactions merged from Drive in the last background sync. */
    readonly mergeCount: WritableSignal<number> = signal<number>(0);
    /** Transactions with true conflicts (both sides changed since last sync). */
    readonly syncConflicts: WritableSignal<Array<ITransactionConflict>> = signal<
        Array<ITransactionConflict>
    >([]);

    /**
     * Firebase UID — set by SyncService after auth resolves.
     * Used by commitToLocal() for encryption.
     */
    userId: string | null = null;

    // --- Database initialization ---

    async initialize(): Promise<void> {
        this.isLoading.set(true);
        try {
            await initDatabase();
            this.refreshAllFromDb();
            this.isInitialized.set(true);
        } catch (error: unknown) {
            console.error('Failed to initialize database:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    async loadFromEncryptedData(data: Uint8Array): Promise<void> {
        this.isLoading.set(true);
        try {
            await loadDatabase(data);
            this.refreshAllFromDb();
            this.isInitialized.set(true);
        } catch (error: unknown) {
            console.error('Failed to load encrypted data:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    // --- Transaction CRUD ---

    async addTransaction(tx: ITransaction): Promise<void> {
        insertTransaction(tx);
        this.transactions.set(getAllTransactions());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async addTransactions(txs: Array<ITransaction>): Promise<void> {
        insertTransactions(txs);
        this.transactions.set(getAllTransactions());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async updateTransaction(tx: ITransaction): Promise<void> {
        updateTransaction(tx);
        this.transactions.set(getAllTransactions());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async removeTransaction(txId: string): Promise<void> {
        deleteTransaction(txId);
        this.transactions.set(getAllTransactions());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    // --- Account CRUD ---

    async addAccount(account: IAccount): Promise<void> {
        insertAccount(account);
        this.accounts.set(getAllAccounts());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async updateAccount(account: IAccount): Promise<void> {
        updateAccount(account);
        this.accounts.set(getAllAccounts());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async removeAccount(accountId: string): Promise<void> {
        softDeleteAccountCascade(accountId);
        this.accounts.set(getAllAccounts());
        this.transactions.set(getAllTransactions());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    // --- Payee ---

    async getOrCreatePayee(name: string): Promise<IPayee> {
        // Check signal cache first
        const existing: IPayee | undefined = this.payees().find(
            (p: IPayee): boolean => p.name === name
        );
        if (existing) return existing;

        // Check DB
        const dbPayee: IPayee | null = getPayeeByName(name);
        if (dbPayee) {
            this.payees.set(getAllPayees());
            return dbPayee;
        }

        // Create new
        const now: ISODateString = new Date().toISOString() as ISODateString;
        const newPayee: IPayee = {
            id: `payee-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: null,
            defaultCategoryId: null,
            createdAt: now,
            updatedAt: now
        };

        insertPayee(newPayee);
        this.payees.set(getAllPayees());
        this.isDirty.set(true);
        return newPayee;
    }

    async updatePayee(payee: IPayee): Promise<void> {
        updatePayee(payee);
        this.payees.set(getAllPayees());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    // --- Recurring Schedules ---

    async addSchedule(schedule: IRecurringSchedule): Promise<void> {
        insertRecurringSchedule(schedule);
        this.schedules.set(getAllRecurringSchedules());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async updateSchedule(schedule: IRecurringSchedule): Promise<void> {
        updateRecurringSchedule(schedule);
        this.schedules.set(getAllRecurringSchedules());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    async removeSchedule(scheduleId: string): Promise<void> {
        deleteRecurringSchedule(scheduleId);
        this.schedules.set(getAllRecurringSchedules());
        await this.commitToLocal();
        this.isDirty.set(true);
    }

    // --- Sync helpers ---

    exportForSync(): Uint8Array {
        return exportDatabase();
    }

    async reconcileTransactions(
        parsedTxs: Array<IParsedTransaction>,
        accountId: string
    ): Promise<Array<IReconciliationMatch>> {
        const db = getDb();
        if (!db) throw new Error('Database not initialized');
        return ReconciliationEngine.reconcile(db, parsedTxs, accountId);
    }

    /**
     * Resolve a specific conflict by choosing one side.
     * Called by the ConflictResolutionModal after the user makes a choice.
     *
     * @param id         Transaction ID
     * @param keepMine   true = keep local version, false = apply remote version
     */
    async resolveConflict(id: string, keepMine: boolean): Promise<void> {
        if (!keepMine) {
            // Apply the remote version — it's already in syncConflicts
            const conflict = this.syncConflicts().find(c => c.id === id);
            if (conflict) {
                const now = new Date().toISOString();
                const tx: ITransaction = {
                    id: conflict.id,
                    accountId: conflict.theirs.accountId,
                    payeeId: conflict.theirs.payeeId,
                    date: conflict.theirs.date as ISODateString,
                    payee: conflict.theirs.payee,
                    memo: conflict.theirs.memo ?? '',
                    totalAmount: conflict.theirs.totalAmount,
                    status: conflict.theirs.status as ITransaction['status'],
                    splits: [],
                    checkNumber: conflict.theirs.checkNumber,
                    importHash: conflict.theirs.importHash ?? '',
                    createdAt: now as ISODateString,
                    updatedAt: now as ISODateString
                };
                await this.updateTransaction(tx);
            }
        }
        // Remove this conflict from the list (whether kept mine or applied theirs)
        this.syncConflicts.update(c => c.filter(x => x.id !== id));
    }

    reset(): void {
        resetDatabase();
        this.transactions.set([]);
        this.accounts.set([]);
        this.payees.set([]);
        this.categories.set([]);
        this.schedules.set([]);
        this.isInitialized.set(false);
        this.isDirty.set(false);
        this.syncStatus.set('synced');
        this.syncError.set(null);
        this.authError.set(false);
        this.hasLocalFallback.set(false);
        this.mergeCount.set(0);
        this.syncConflicts.set([]);
    }

    // --- Private helpers ---

    /**
     * Immediately commits the current SQL.js state to IndexedDB.
     * Called after every mutation as the local write-through step.
     * Non-fatal: if encryption or IndexedDB fails, we log and continue
     * (the SQL.js in-memory state is still correct).
     */
    private async commitToLocal(): Promise<void> {
        if (!this.userId) return; // not yet initialized with auth context
        try {
            const dbExport = exportDatabase();
            const encrypted = await encryptDatabase(dbExport, this.userId);
            await saveLocalSnapshot(encrypted);
        } catch (err: unknown) {
            console.error('[LedgerStore] commitToLocal failed (non-fatal):', err);
        }
    }

    private refreshAllFromDb(): void {
        this.transactions.set(getAllTransactions());
        this.accounts.set(getAllAccounts());
        this.payees.set(getAllPayees());
        this.categories.set(getAllCategories());
        this.schedules.set(getAllRecurringSchedules());
    }
}
