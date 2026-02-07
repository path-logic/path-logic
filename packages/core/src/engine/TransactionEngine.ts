import { KnownCategory } from '../domain/CategoryDefaults';
import { ErrorCode } from '../domain/ErrorCode';
import type { Cents, EntityId, ISODateString, ISplit, ITransaction } from '../domain/types';
import { TransactionStatus } from '../domain/types';
import type { Result } from '../shared/Result';
import type { IValidationResult } from './invariants';
import { validateSplitSum } from './invariants';

export interface IPaycheckParams {
    id: EntityId;
    accountId: EntityId;
    payeeId: EntityId;
    date: ISODateString;
    memo?: string;
    grossPay: Cents;
    federalTax?: Cents;
    stateTax?: Cents;
    localTax?: Cents;
    socialSecurity?: Cents;
    medicare?: Cents;
    healthInsurance?: Cents;
    visionInsurance?: Cents;
    dentalInsurance?: Cents;
    fourOhOneK?: Cents;
    hsa?: Cents;
    otherDeductions?: Array<{ memo: string; amount: Cents; categoryId?: EntityId }>;
}

export interface IMortgageParams {
    id: EntityId;
    accountId: EntityId;
    payeeId: EntityId;
    date: ISODateString;
    memo?: string;
    totalAmount: Cents;
    principal: Cents;
    interest: Cents;
    escrow?: Cents;
    propertyTax?: Cents;
    pmi?: Cents;
    otherFees?: Array<{ memo: string; amount: Cents; categoryId?: EntityId }>;
}

/**
 * Interface definition for the core transaction engine.
 * Decoupled for testing and dependency injection.
 */
export interface ITransactionEngine {
    autoBalanceSplits(transaction: ITransaction): ITransaction;
    validateTransaction(transaction: ITransaction): Result<void>;
    createPaycheck(params: IPaycheckParams): ITransaction;
    createMortgagePayment(params: IMortgageParams): ITransaction;
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
        const currentSum: number = transaction.splits.reduce(
            (s: number, sp: ISplit) => s + sp.amount,
            0,
        );
        const discrepancy: number = transaction.totalAmount - currentSum;

        if (discrepancy === 0) return transaction;

        const updatedSplits: Array<ISplit> = [...transaction.splits];

        if (updatedSplits.length === 0) {
            updatedSplits.push({
                id: `${transaction.id}-split-auto`,
                categoryId: null,
                memo: 'Auto-balanced discrepancy',
                amount: discrepancy,
            } satisfies ISplit);
        } else {
            const lastIndex: number = updatedSplits.length - 1;
            const lastSplit: ISplit | undefined = updatedSplits[lastIndex];
            if (lastSplit) {
                updatedSplits[lastIndex] = {
                    ...lastSplit,
                    amount: lastSplit.amount + discrepancy,
                } satisfies ISplit;
            }
        }

        return {
            ...transaction,
            splits: updatedSplits,
            updatedAt: new Date().toISOString(),
        } satisfies ITransaction;
    }

    /**
     * Runs all domain-level validation rules for a transaction.
     */
    public validateTransaction(transaction: ITransaction): Result<void> {
        // 1. Validate split sum invariant
        const validation: IValidationResult = validateSplitSum(transaction);
        if (!validation.valid) {
            return {
                success: false,
                error: {
                    code: ErrorCode.SplitSumMismatch,
                    message: validation.error || 'Split sum mismatch',
                    details: { discrepancy: validation.discrepancy },
                },
            } satisfies Result<void>;
        }

        // 2. Validate status rules
        if (transaction.status === TransactionStatus.Reconciled) {
            // Reconciled transactions are immutable at this level
        }

        return { success: true, value: undefined } satisfies Result<void>;
    }

    /**
     * Helper to create a granular paycheck transaction.
     */
    public createPaycheck(params: IPaycheckParams): ITransaction {
        const splits: Array<ISplit> = [];
        let netAmount: number = params.grossPay;

        // Add Gross Pay split
        splits.push({
            id: `${params.id}-gross`,
            categoryId: KnownCategory.GrossPay,
            memo: 'Gross Pay',
            amount: params.grossPay,
        });

        const addDeduction = (
            amount: Cents | undefined,
            categoryId: string,
            memo: string,
        ): void => {
            if (amount && amount !== 0) {
                // Deductions are stored as negative amounts in splits
                const deductionAmount: number = amount > 0 ? -amount : amount;
                splits.push({
                    id: `${params.id}-${categoryId.replace('cat-', '')}`,
                    categoryId,
                    memo,
                    amount: deductionAmount,
                });
                netAmount += deductionAmount;
            }
        };

        addDeduction(params.federalTax, KnownCategory.FederalTax, 'Federal Income Tax');
        addDeduction(params.stateTax, KnownCategory.StateTax, 'State Income Tax');
        addDeduction(params.localTax, KnownCategory.LocalTax, 'Local Income Tax');
        addDeduction(params.socialSecurity, KnownCategory.SocialSecurity, 'Social Security');
        addDeduction(params.medicare, KnownCategory.Medicare, 'Medicare');
        addDeduction(params.healthInsurance, KnownCategory.HealthInsurance, 'Health Insurance');
        addDeduction(params.visionInsurance, KnownCategory.VisionInsurance, 'Vision Insurance');
        addDeduction(params.dentalInsurance, KnownCategory.DentalInsurance, 'Dental Insurance');
        addDeduction(params.fourOhOneK, KnownCategory.FourOhOneK, '401(k) Contribution');
        addDeduction(params.hsa, KnownCategory.HSA, 'HSA Contribution');

        if (params.otherDeductions) {
            params.otherDeductions.forEach((d, i) => {
                const deductionAmount: number = d.amount > 0 ? -d.amount : d.amount;
                splits.push({
                    id: `${params.id}-other-${i}`,
                    categoryId: d.categoryId || KnownCategory.Uncategorized,
                    memo: d.memo,
                    amount: deductionAmount,
                });
                netAmount += deductionAmount;
            });
        }

        const now: string = new Date().toISOString();
        return {
            id: params.id,
            accountId: params.accountId,
            payeeId: params.payeeId,
            date: params.date,
            payee: 'Paycheck', // Default payee name
            memo: params.memo || '',
            totalAmount: netAmount, // Total is the net amount deposited
            status: TransactionStatus.Pending,
            splits,
            checkNumber: null,
            importHash: '',
            createdAt: now,
            updatedAt: now,
        } satisfies ITransaction;
    }

    /**
     * Helper to create a granular mortgage payment transaction.
     */
    public createMortgagePayment(params: IMortgageParams): ITransaction {
        const splits: Array<ISplit> = [];

        splits.push({
            id: `${params.id}-principal`,
            categoryId: KnownCategory.MortgagePrincipal,
            memo: 'Principal',
            amount: params.principal,
        });

        splits.push({
            id: `${params.id}-interest`,
            categoryId: KnownCategory.MortgageInterest,
            memo: 'Interest',
            amount: params.interest,
        });

        if (params.escrow) {
            splits.push({
                id: `${params.id}-escrow`,
                categoryId: KnownCategory.Escrow,
                memo: 'Escrow',
                amount: params.escrow,
            });
        }

        if (params.propertyTax) {
            splits.push({
                id: `${params.id}-prop-tax`,
                categoryId: KnownCategory.PropertyTax,
                memo: 'Property Tax',
                amount: params.propertyTax,
            });
        }

        if (params.pmi) {
            splits.push({
                id: `${params.id}-pmi`,
                categoryId: KnownCategory.MortgagePMI,
                memo: 'PMI',
                amount: params.pmi,
            });
        }

        if (params.otherFees) {
            params.otherFees.forEach((f, i) => {
                splits.push({
                    id: `${params.id}-fee-${i}`,
                    categoryId: f.categoryId || KnownCategory.Uncategorized,
                    memo: f.memo,
                    amount: f.amount,
                });
            });
        }

        const now: string = new Date().toISOString();
        return {
            id: params.id,
            accountId: params.accountId,
            payeeId: params.payeeId,
            date: params.date,
            payee: 'Mortgage',
            memo: params.memo || '',
            totalAmount: params.totalAmount,
            status: TransactionStatus.Pending,
            splits,
            checkNumber: null,
            importHash: '',
            createdAt: now,
            updatedAt: now,
        } satisfies ITransaction;
    }
}
