import { create } from 'zustand';
import type { ITransaction } from '@path-logic/core';
import {
    initDatabase,
    getAllTransactions,
    insertTransaction,
    updateTransaction,
    deleteTransaction,
    exportDatabase,
    loadDatabase,
} from '@/lib/storage/SQLiteAdapter';

interface ILedgerStore {
    transactions: Array<ITransaction>;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    initialize: () => Promise<void>;
    loadFromEncryptedData: (data: Uint8Array) => Promise<void>;
    addTransaction: (tx: ITransaction) => Promise<void>;
    updateTransaction: (tx: ITransaction) => Promise<void>;
    deleteTransaction: (txId: string) => Promise<void>;
    exportForSync: () => Uint8Array;
}

export const useLedgerStore = create<ILedgerStore>((set) => ({
    transactions: [],
    isLoading: false,
    isInitialized: false,

    initialize: async (): Promise<void> => {
        set({ isLoading: true });
        try {
            await initDatabase();
            const transactions: Array<ITransaction> = getAllTransactions();
            set({ transactions, isInitialized: true, isLoading: false });
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
            set({ transactions, isInitialized: true, isLoading: false });
        } catch (error) {
            console.error('Failed to load encrypted data:', error);
            set({ isLoading: false });
        }
    },

    addTransaction: async (tx: ITransaction): Promise<void> => {
        try {
            insertTransaction(tx);
            const transactions: Array<ITransaction> = getAllTransactions();
            set({ transactions });
        } catch (error) {
            console.error('Failed to add transaction:', error);
            throw error;
        }
    },

    updateTransaction: async (tx: ITransaction): Promise<void> => {
        try {
            updateTransaction(tx);
            const transactions: Array<ITransaction> = getAllTransactions();
            set({ transactions });
        } catch (error) {
            console.error('Failed to update transaction:', error);
            throw error;
        }
    },

    deleteTransaction: async (txId: string): Promise<void> => {
        try {
            deleteTransaction(txId);
            const transactions: Array<ITransaction> = getAllTransactions();
            set({ transactions });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            throw error;
        }
    },

    exportForSync: (): Uint8Array => {
        return exportDatabase();
    },
}));
