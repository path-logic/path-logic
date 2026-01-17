import type { ITransaction, Cents, ISplit } from '../domain/types';

export interface IValidationResult {
    valid: boolean;
    error?: string;
    discrepancy?: Cents;
}

/**
 * Validates that the sum of splits equals the transaction totalAmount.
 * Rule: Sum(Splits) === totalAmount
 */
export function validateSplitSum(transaction: ITransaction): IValidationResult {
    const splitSum: number = transaction.splits.reduce(
        (sum: number, split: ISplit) => sum + split.amount,
        0,
    );

    if (splitSum !== transaction.totalAmount) {
        return {
            valid: false,
            error: `Split sum (${splitSum}) !== Total (${transaction.totalAmount})`,
            discrepancy: transaction.totalAmount - splitSum,
        } satisfies IValidationResult;
    }

    return { valid: true } satisfies IValidationResult;
}
