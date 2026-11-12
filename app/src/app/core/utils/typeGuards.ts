import type { IAutoLoanMetadata, IMortgageMetadata, IPersonalLoanMetadata } from '../domain/types';
import { AccountType } from '../domain/types';

/**
 * Check if an account type is a loan type
 */
export function isLoanAccount(type: AccountType): boolean {
    return [AccountType.Mortgage, AccountType.AutoLoan, AccountType.PersonalLoan].includes(type);
}

/**
 * Check if an account type is a credit card type
 */
export function isCreditCardAccount(type: AccountType): boolean {
    return type === AccountType.Credit;
}

/**
 * Check if an account type is a liability (Credit Card or Loan)
 */
export function isLiabilityAccount(type: AccountType): boolean {
    return isCreditCardAccount(type) || isLoanAccount(type);
}

/**
 * Type guard for Mortgage Metadata
 */
export function isMortgageMetadata(metadata: unknown): metadata is IMortgageMetadata {
    return typeof metadata === 'object' && metadata !== null && 'escrowIncluded' in metadata;
}

/**
 * Type guard for Auto Loan Metadata
 */
export function isAutoLoanMetadata(metadata: unknown): metadata is IAutoLoanMetadata {
    return (
        typeof metadata === 'object' &&
        metadata !== null &&
        ('vehicleMake' in metadata || 'vehicleModel' in metadata || 'vin' in metadata)
    );
}

/**
 * Type guard for Personal Loan Metadata
 */
export function isPersonalLoanMetadata(metadata: unknown): metadata is IPersonalLoanMetadata {
    return typeof metadata === 'object' && metadata !== null && 'secured' in metadata;
}
