import type { ISODateString, ITransaction, TransactionStatus } from '@path-logic/core';

/**
 * Test utility to create minimal sample transactions for validating
 * storage and sync functionality without overwhelming data.
 */

/**
 * Generate a simple test transaction
 */
export function createTestTransaction(
    id: string,
    date: ISODateString,
    payee: string,
    amount: number,
    status: TransactionStatus = 'cleared'
): ITransaction {
    const now: ISODateString = new Date().toISOString() as ISODateString;

    return {
        id,
        accountId: 'test-account',
        date,
        payee,
        memo: `Test transaction: ${payee}`,
        totalAmount: amount,
        status,
        checkNumber: '',
        importHash: `test-${id}`,
        createdAt: now,
        updatedAt: now,
        splits: [
            {
                id: `${id}-split-1`,
                amount,
                memo: payee,
                categoryId: null,
            },
        ],
    };
}

/**
 * Generate a small set of test transactions (5 transactions)
 * Perfect for validating storage and sync without overwhelming data
 */
export function generateTestDataset(): Array<ITransaction> {
    const today: Date = new Date();
    const yesterday: Date = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek: Date = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return [
        createTestTransaction(
            'test-1',
            lastWeek.toISOString().split('T')[0] as ISODateString,
            'Grocery Store',
            -5432, // -$54.32
            'cleared'
        ),
        createTestTransaction(
            'test-2',
            lastWeek.toISOString().split('T')[0] as ISODateString,
            'Gas Station',
            -3599, // -$35.99
            'cleared'
        ),
        createTestTransaction(
            'test-3',
            yesterday.toISOString().split('T')[0] as ISODateString,
            'Coffee Shop',
            -675, // -$6.75
            'cleared'
        ),
        createTestTransaction(
            'test-4',
            today.toISOString().split('T')[0] as ISODateString,
            'Paycheck',
            250000, // +$2,500.00
            'cleared'
        ),
        createTestTransaction(
            'test-5',
            today.toISOString().split('T')[0] as ISODateString,
            'Pending Purchase',
            -12999, // -$129.99
            'pending'
        ),
    ];
}

/**
 * Console helper to log storage/sync operations
 */
export const testLogger = {
    info: (message: string, data?: unknown): void => {
        console.log(`[TEST] ${message}`, data || '');
    },
    success: (message: string): void => {
        console.log(`[TEST] ✅ ${message}`);
    },
    error: (message: string, error: unknown): void => {
        console.error(`[TEST] ❌ ${message}`, error);
    },
};
