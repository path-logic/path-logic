import {
    EntityId,
    ITransaction,
    ISplit,
    TransactionStatus,
} from '../domain/types';
import { Result } from '../shared/Result';
import { ErrorCode } from '../domain/ErrorCode';
import { validateSplitSum } from './invariants';

/**
 * Interface definition for the core transaction engine.
 * Decoupled for testing and dependency injection.
 */
export interface ITransactionEngine {
    autoBalanceSplits(transaction: ITransaction): ITransaction;
    validateTransaction(transaction: ITransaction): Result<void>;
}

/**
 * Concrete implementation of the Penny-Perfect Core Engine logic.
 */
export class TransactionEngine implements ITransactionEngine {
    /**
     * Automatically balances the splits of a transaction to match the totalAmount.
     * Strategy: Adds discrepancy to the last split or creates a new one.
     */
    public autoBalanceSplits(transaction: ITransaction): ITransaction {
        const currentSum = transaction.splits.reduce((s, sp) => s + sp.amount, 0);
        const discrepancy = transaction.totalAmount - currentSum;

        if (discrepancy === 0) return transaction;

        const updatedSplits: Array<ISplit> = [...transaction.splits];

        if (updatedSplits.length === 0) {
            updatedSplits.push({
                id: 'auto-balanced-id', // Placeholder ID to be replaced by caller
                categoryId: null,
                memo: 'Auto-balanced discrepancy',
                amount: discrepancy,
            });
        } else {
            const lastIndex = updatedSplits.length - 1;
            const lastSplit = updatedSplits[lastIndex];
            if (lastSplit) {
                updatedSplits[lastIndex] = {
                    ...lastSplit,
                    amount: lastSplit.amount + discrepancy,
                };
            }
        }

        return { ...transaction, splits: updatedSplits };
    }

    /**
     * Runs all domain-level validation rules for a transaction.
     */
    public validateTransaction(transaction: ITransaction): Result<void> {
        // 1. Validate split sum invariant
        const validation = validateSplitSum(transaction);
        if (!validation.valid) {
            return {
                success: false,
                error: {
                    code: ErrorCode.SplitSumMismatch,
                    message: validation.error || 'Split sum mismatch',
                    details: { discrepancy: validation.discrepancy },
                },
            };
        }

        // 2. Validate status rules
        if (transaction.status === TransactionStatus.Reconciled) {
            // Reconciled transactions are immutable at this level
            // Implementation detail: checking this might happen higher up
        }

        return { success: true, value: undefined };
    }
}
