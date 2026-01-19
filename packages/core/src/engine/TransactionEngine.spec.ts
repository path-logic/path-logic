import { describe, expect, it } from 'vitest';

import { ErrorCode } from '../domain/ErrorCode';
import { type ISODateString, type ITransaction, TransactionStatus } from '../domain/types';
import { TransactionEngine } from './TransactionEngine';

describe('TransactionEngine', () => {
    const engine = new TransactionEngine();

    const createMockTransaction = (overrides: Partial<ITransaction> = {}): ITransaction => ({
        id: 'tx-1',
        accountId: 'acc-1',
        payeeId: 'payee-1',
        date: '2026-01-15' as ISODateString,
        payee: 'Test Payee',
        memo: 'Test Memo',
        totalAmount: 10000,
        status: TransactionStatus.Pending,
        splits: [{ id: 's1', categoryId: 'cat-1', memo: 'Split 1', amount: 10000 }],
        checkNumber: null,
        importHash: 'hash',
        createdAt: '2026-01-15T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-15T00:00:00Z' as ISODateString,
        ...overrides,
    });

    describe('autoBalanceSplits', () => {
        it('should return the same transaction if already balanced', () => {
            const tx = createMockTransaction({
                totalAmount: 100,
                splits: [{ id: 's1', categoryId: 'cat-1', memo: 'm1', amount: 100 }],
            });
            const result = engine.autoBalanceSplits(tx);
            expect(result).toEqual(tx);
        });

        it('should create a new split if no splits exist', () => {
            const tx = createMockTransaction({
                totalAmount: 500,
                splits: [],
            });
            const result = engine.autoBalanceSplits(tx);
            expect(result.splits).toBeDefined();
            if (result.splits) {
                expect(result.splits[0]?.amount).toBe(500);
                expect(result.splits[0]?.memo).toBe('Auto-balanced discrepancy');
            }
        });

        it('should update the last split if it exists and there is a discrepancy', () => {
            const tx = createMockTransaction({
                totalAmount: 1000,
                splits: [
                    { id: 's1', categoryId: 'cat-1', memo: 'm1', amount: 600 },
                    { id: 's2', categoryId: 'cat-2', memo: 'm2', amount: 300 },
                ],
            });
            const result = engine.autoBalanceSplits(tx);
            expect(result.splits).toBeDefined();
            if (result.splits) {
                expect(result.splits[1]?.amount).toBe(400);
            }
            // 300 + 100 discrepancy
        });

        it('should handle negative discrepancies', () => {
            const tx = createMockTransaction({
                totalAmount: 500,
                splits: [{ id: 's1', categoryId: 'cat-1', memo: 'm1', amount: 600 }],
            });
            const result = engine.autoBalanceSplits(tx);
            if (result.splits) {
                expect(result.splits[0]?.amount).toBe(500);
            }
        });
    });

    describe('validateTransaction', () => {
        it('should return success for a balanced transaction', () => {
            const tx = createMockTransaction({
                totalAmount: 1000,
                splits: [{ id: 's1', categoryId: 'cat-1', memo: 'm1', amount: 1000 }],
            });
            const result = engine.validateTransaction(tx);
            expect(result.success).toBe(true);
        });

        it('should return failure for an unbalanced transaction', () => {
            const tx = createMockTransaction({
                totalAmount: 1000,
                splits: [{ id: 's1', categoryId: 'cat-1', memo: 'm1', amount: 900 }],
            });
            const result = engine.validateTransaction(tx);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.code).toBe(ErrorCode.SplitSumMismatch);
                expect(result.error.details).toEqual({ discrepancy: 100 });
            }
        });

        it('should handle reconciled transactions (placeholder logic)', () => {
            const tx = createMockTransaction({
                status: TransactionStatus.Reconciled,
            });
            const result = engine.validateTransaction(tx);
            expect(result.success).toBe(true);
        });
    });
});
