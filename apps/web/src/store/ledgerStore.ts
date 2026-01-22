import { create } from 'zustand';
import type { ITransaction, IAccount, IPayee, ICategory, ISODateString } from '@path-logic/core';
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
} from '@/lib/storage/SQLiteAdapter';

interface ILedgerStore {
    transactions: Array<ITransaction>;
    accounts: Array<IAccount>;
    payees: Array<IPayee>;
    categories: Array<ICategory>;
    isLoading: boolean;
    isInitialized: boolean;
    authError: boolean;
    isDirty: boolean;

    // Actions
    initialize: () => Promise<void>;
    loadFromEncryptedData: (data: Uint8Array) => Promise<void>;
    setAuthError: (error: boolean) => void;
    setDirty: (dirty: boolean) => void;

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

    // Sync/Generic
    exportForSync: () => Uint8Array;
}

export const useLedgerStore = create<ILedgerStore>((set: (partial: Partial<ILedgerStore>) => void, get: () => ILedgerStore) => ({
    transactions: new Array<ITransaction>(),
    accounts: new Array<IAccount>(),
    payees: new Array<IPayee>(),
    categories: new Array<ICategory>(),
    isLoading: false,
    isInitialized: false,
    authError: false,
    isDirty: false,

    initialize: async (): Promise<void> => {
        set({ isLoading: true });
        try {
            await initDatabase();
            const transactions: Array<ITransaction> = getAllTransactions();
            const accounts: Array<IAccount> = getAllAccounts();
            const payees: Array<IPayee> = getAllPayees();
            const categories: Array<ICategory> = getAllCategories();

            set({
                transactions,
                accounts,
                payees,
                categories,
                isInitialized: true,
                isLoading: false
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

            set({
                transactions,
                accounts,
                payees,
                categories,
                isInitialized: true,
                isLoading: false
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
        const existing = get().payees.find(p => p.name === name);
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

    setAuthError: (error: boolean): void => {
        set({ authError: error });
    },

    setDirty: (dirty: boolean): void => {
        set({ isDirty: dirty });
    },

    exportForSync: (): Uint8Array => {
        return exportDatabase();
    },
}));
