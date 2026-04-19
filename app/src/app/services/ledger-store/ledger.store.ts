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

import type { ILockStatus } from '../../lib/storage/GoogleDriveAdapter';
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
    softDeleteAccount,
    updateAccount,
    updateRecurringSchedule,
    updateTransaction
} from '../../lib/storage/SQLiteAdapter';
import {
    type IReconciliationMatch,
    ReconciliationEngine
} from '../../lib/sync/ReconciliationEngine';

/**
 * Angular signal-based ledger store.
 * Replaces the Zustand `useLedgerStore` with Angular signals.
 *
 * All state is reactive via signals. Mutations happen through methods
 * that write to SQLite then refresh the signal values.
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
    readonly syncStatus: WritableSignal<'synced' | 'pending-local' | 'error'> = signal<
        'synced' | 'pending-local' | 'error'
    >('synced');
    readonly syncError: WritableSignal<string | null> = signal<string | null>(null);
    readonly hasLocalFallback: WritableSignal<boolean> = signal<boolean>(false);
    readonly lockStatus: WritableSignal<ILockStatus | null> = signal<ILockStatus | null>(null);

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
        this.isDirty.set(true);
    }

    async addTransactions(txs: Array<ITransaction>): Promise<void> {
        insertTransactions(txs);
        this.transactions.set(getAllTransactions());
        this.isDirty.set(true);
    }

    async updateTransaction(tx: ITransaction): Promise<void> {
        updateTransaction(tx);
        this.transactions.set(getAllTransactions());
        this.isDirty.set(true);
    }

    async removeTransaction(txId: string): Promise<void> {
        deleteTransaction(txId);
        this.transactions.set(getAllTransactions());
        this.isDirty.set(true);
    }

    // --- Account CRUD ---

    async addAccount(account: IAccount): Promise<void> {
        insertAccount(account);
        this.accounts.set(getAllAccounts());
        this.isDirty.set(true);
    }

    async updateAccount(account: IAccount): Promise<void> {
        updateAccount(account);
        this.accounts.set(getAllAccounts());
        this.isDirty.set(true);
    }

    async removeAccount(accountId: string): Promise<void> {
        softDeleteAccount(accountId);
        this.accounts.set(getAllAccounts());
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

    // --- Recurring Schedules ---

    async addSchedule(schedule: IRecurringSchedule): Promise<void> {
        insertRecurringSchedule(schedule);
        this.schedules.set(getAllRecurringSchedules());
        this.isDirty.set(true);
    }

    async updateSchedule(schedule: IRecurringSchedule): Promise<void> {
        updateRecurringSchedule(schedule);
        this.schedules.set(getAllRecurringSchedules());
        this.isDirty.set(true);
    }

    async removeSchedule(scheduleId: string): Promise<void> {
        deleteRecurringSchedule(scheduleId);
        this.schedules.set(getAllRecurringSchedules());
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
    }

    // --- Private helpers ---

    private refreshAllFromDb(): void {
        this.transactions.set(getAllTransactions());
        this.accounts.set(getAllAccounts());
        this.payees.set(getAllPayees());
        this.categories.set(getAllCategories());
        this.schedules.set(getAllRecurringSchedules());
    }
}
