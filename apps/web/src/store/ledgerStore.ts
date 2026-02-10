import { create } from 'zustand';
import {
    initDatabase,
    getAllTransactions,
    insertTransaction,
    insertTransactions,
    updateTransaction,
    deleteTransaction,
    exportDatabase,
    loadDatabase,
    getAllAccounts,
    insertAccount,
    updateAccount,
    softDeleteAccount,
    getAllPayees,
    insertPayee,
    getPayeeByName,
    getAllCategories,
    getAllRecurringSchedules,
    insertRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    getDb,
    resetDatabase,
} from '@/lib/storage/SQLiteAdapter';
import { ReconciliationEngine, type IReconciliationMatch } from '@/lib/sync/ReconciliationEngine';
import type {
    ITransaction,
    IAccount,
    IPayee,
    ICategory,
    ISODateString,
    IRecurringSchedule,
    IParsedTransaction,
} from '@path-logic/core';

interface ILedgerStore {
    transactions: Array<ITransaction>;
    accounts: Array<IAccount>;
    payees: Array<IPayee>;
    categories: Array<ICategory>;
    schedules: Array<IRecurringSchedule>;
    isLoading: boolean;
    isInitialized: boolean;
    authError: boolean;
    isDirty: boolean;
    syncStatus: 'synced' | 'pending-local' | 'error';
    syncError: string | null;
    hasLocalFallback: boolean;
    lockStatus: {
        clientId: string;
        deviceName: string;
        issuedAt: string;
        expiresAt: string;
        status: 'merging';
    } | null;

    // Actions
    initialize: () => Promise<void>;
    loadFromEncryptedData: (data: Uint8Array) => Promise<void>;
    setAuthError: (error: boolean) => void;
    setDirty: (dirty: boolean) => void;
    setSyncStatus: (status: 'synced' | 'pending-local' | 'error') => void;
    setHasLocalFallback: (hasFallback: boolean) => void;
    setLockStatus: (status: ILedgerStore['lockStatus']) => void;
    setSyncError: (error: string | null) => void;

    // Transaction Actions
    addTransaction: (tx: ITransaction) => Promise<void>;
    addTransactions: (txs: Array<ITransaction>) => Promise<void>;
    updateTransaction: (tx: ITransaction) => Promise<void>;
    deleteTransaction: (txId: string) => Promise<void>;

    // Account Actions
    addAccount: (account: IAccount) => Promise<void>;
    updateAccount: (account: IAccount) => Promise<void>;
    softDeleteAccount: (accountId: string) => Promise<void>;

    // Payee Actions
    getOrCreatePayee: (name: string) => Promise<IPayee>;

    // Recurring Schedule Actions
    addSchedule: (schedule: IRecurringSchedule) => Promise<void>;
    updateSchedule: (schedule: IRecurringSchedule) => Promise<void>;
    deleteSchedule: (scheduleId: string) => Promise<void>;

    // Sync/Generic
    exportForSync: () => Uint8Array;
    reconcileTransactions: (
        parsedTxs: Array<IParsedTransaction>,
        accountId: string,
    ) => Promise<Array<IReconciliationMatch>>;
    reset: () => void;
}

export const useLedgerStore = create<ILedgerStore>(
    (set: (partial: Partial<ILedgerStore>) => void, get: () => ILedgerStore) => ({
        transactions: new Array<ITransaction>(),
        accounts: new Array<IAccount>(),
        payees: new Array<IPayee>(),
        categories: new Array<ICategory>(),
        schedules: new Array<IRecurringSchedule>(),
        isLoading: false,
        isInitialized: false,
        authError: false,
        isDirty: false,
        syncStatus: 'synced',
        syncError: null,
        hasLocalFallback: false,
        lockStatus: null,

        initialize: async (): Promise<void> => {
            set({ isLoading: true });
            try {
                await initDatabase();
                const transactions: Array<ITransaction> = getAllTransactions();
                const accounts: Array<IAccount> = getAllAccounts();
                const payees: Array<IPayee> = getAllPayees();
                const categories: Array<ICategory> = getAllCategories();
                const schedules: Array<IRecurringSchedule> = getAllRecurringSchedules();

                set({
                    transactions,
                    accounts,
                    payees,
                    categories,
                    schedules,
                    isInitialized: true,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to initialize database:', error);
                set({ isLoading: false });
            }
        },

        loadFromEncryptedData: async (data: Uint8Array): Promise<void> => {
            set({ isLoading: true });
            try {
                await loadDatabase(data);
                const transactions: Array<ITransaction> = getAllTransactions();
                const accounts: Array<IAccount> = getAllAccounts();
                const payees: Array<IPayee> = getAllPayees();
                const categories: Array<ICategory> = getAllCategories();
                const schedules: Array<IRecurringSchedule> = getAllRecurringSchedules();

                set({
                    transactions,
                    accounts,
                    payees,
                    categories,
                    schedules,
                    isInitialized: true,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to load encrypted data:', error);
                set({ isLoading: false });
            }
        },

        addTransaction: async (tx: ITransaction): Promise<void> => {
            try {
                insertTransaction(tx);
                const transactions: Array<ITransaction> = getAllTransactions();
                set({ transactions, isDirty: true });
            } catch (error) {
                console.error('Failed to add transaction:', error);
                throw error;
            }
        },

        addTransactions: async (txs: Array<ITransaction>): Promise<void> => {
            try {
                insertTransactions(txs);
                const transactions: Array<ITransaction> = getAllTransactions();
                set({ transactions, isDirty: true });
            } catch (error) {
                console.error('Failed to add transactions:', error);
                throw error;
            }
        },

        updateTransaction: async (tx: ITransaction): Promise<void> => {
            try {
                updateTransaction(tx);
                const transactions: Array<ITransaction> = getAllTransactions();
                set({ transactions, isDirty: true });
            } catch (error) {
                console.error('Failed to update transaction:', error);
                throw error;
            }
        },

        deleteTransaction: async (txId: string): Promise<void> => {
            try {
                deleteTransaction(txId);
                const transactions: Array<ITransaction> = getAllTransactions();
                set({ transactions, isDirty: true });
            } catch (error) {
                console.error('Failed to delete transaction:', error);
                throw error;
            }
        },

        addAccount: async (account: IAccount): Promise<void> => {
            try {
                insertAccount(account);
                const accounts: Array<IAccount> = getAllAccounts();
                set({ accounts, isDirty: true });
            } catch (error) {
                console.error('Failed to add account:', error);
                throw error;
            }
        },

        updateAccount: async (account: IAccount): Promise<void> => {
            try {
                updateAccount(account);
                const accounts: Array<IAccount> = getAllAccounts();
                set({ accounts, isDirty: true });
            } catch (error) {
                console.error('Failed to update account:', error);
                throw error;
            }
        },

        softDeleteAccount: async (accountId: string): Promise<void> => {
            try {
                softDeleteAccount(accountId);
                const accounts: Array<IAccount> = getAllAccounts();
                set({ accounts, isDirty: true });
            } catch (error) {
                console.error('Failed to soft delete account:', error);
                throw error;
            }
        },

        getOrCreatePayee: async (name: string): Promise<IPayee> => {
            // First check store cache for speed
            const existing: IPayee | undefined = get().payees.find((p): boolean => p.name === name);
            if (existing) return existing;

            // Check DB as second source of truth
            const dbPayee = getPayeeByName(name);
            if (dbPayee) {
                set({ payees: getAllPayees() }); // Sync store
                return dbPayee;
            }

            // Create new
            const now = new Date().toISOString() as ISODateString;
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
                updatedAt: now,
            };

            insertPayee(newPayee);
            set({ payees: getAllPayees(), isDirty: true });
            return newPayee;
        },

        addSchedule: async (schedule: IRecurringSchedule): Promise<void> => {
            try {
                insertRecurringSchedule(schedule);
                const schedules = getAllRecurringSchedules();
                set({ schedules, isDirty: true });
            } catch (error) {
                console.error('Failed to add schedule:', error);
                throw error;
            }
        },

        updateSchedule: async (schedule: IRecurringSchedule): Promise<void> => {
            try {
                updateRecurringSchedule(schedule);
                const schedules = getAllRecurringSchedules();
                set({ schedules, isDirty: true });
            } catch (error) {
                console.error('Failed to update schedule:', error);
                throw error;
            }
        },

        deleteSchedule: async (scheduleId: string): Promise<void> => {
            try {
                deleteRecurringSchedule(scheduleId);
                const schedules = getAllRecurringSchedules();
                set({ schedules, isDirty: true });
            } catch (error) {
                console.error('Failed to delete schedule:', error);
                throw error;
            }
        },

        setAuthError: (error: boolean): void => {
            set({ authError: error });
        },

        setDirty: (dirty: boolean): void => {
            set({ isDirty: dirty });
        },

        setSyncStatus: (status: 'synced' | 'pending-local' | 'error'): void => {
            set({ syncStatus: status });
        },

        setHasLocalFallback: (hasFallback: boolean): void => {
            set({ hasLocalFallback: hasFallback });
        },

        setLockStatus: (status: ILedgerStore['lockStatus']): void => {
            set({ lockStatus: status });
        },

        setSyncError: (error: string | null): void => {
            set({ syncError: error });
        },

        exportForSync: (): Uint8Array => {
            return exportDatabase();
        },

        reconcileTransactions: async (
            parsedTxs: Array<IParsedTransaction>,
            accountId: string,
        ): Promise<Array<IReconciliationMatch>> => {
            const db = getDb();
            if (!db) throw new Error('Database not initialized');
            return ReconciliationEngine.reconcile(db, parsedTxs, accountId);
        },

        reset: (): void => {
            resetDatabase();
            set({
                transactions: new Array<ITransaction>(),
                accounts: new Array<IAccount>(),
                payees: new Array<IPayee>(),
                categories: new Array<ICategory>(),
                schedules: new Array<IRecurringSchedule>(),
                isInitialized: false,
                isDirty: false,
                syncStatus: 'synced',
                syncError: null,
                authError: false,
                hasLocalFallback: false,
            });
        },
    }),
);
