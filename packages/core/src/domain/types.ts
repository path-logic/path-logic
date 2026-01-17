/**
 * Monetary amount in CENTS (integer).
 * $100.00 = 10000. Never use floating-point for money.
 * @example 10050 represents $100.50
 */
export type Cents = number;

/**
 * Unique identifier for entities (UUID or deterministic hash).
 */
export type EntityId = string;

/**
 * ISO 8601 Date string (YYYY-MM-DD).
 * @example "2026-01-17"
 */
export type ISODateString = string;

/**
 * Transaction status in the ledger lifecycle.
 */
export enum TransactionStatus {
    /** Imported but not yet matched or verified by the user. */
    Pending = 'pending',
    /** Matched with bank statement but not yet frozen. */
    Cleared = 'cleared',
    /** User-verified and locked; immutable for ledger integrity. */
    Reconciled = 'reconciled',
}

/**
 * Core supported account types.
 */
export enum AccountType {
    Checking = 'checking',
    Savings = 'savings',
    Credit = 'credit',
    Cash = 'cash',
}

/**
 * A sub-allocation of a transaction to a category.
 */
export interface ISplit {
    /** Unique ID for the split. */
    id: EntityId;
    /** Category to which this amount is allocated. Null if uncategorized. */
    categoryId: EntityId | null;
    /** Descriptive text for this split. */
    memo: string;
    /** Amount in cents. Can be negative for deductions (taxes, fees). */
    amount: Cents;
}

/**
 * A financial transaction in the ledger.
 * Transactions consist of a total amount and one or more splits.
 */
export interface ITransaction {
    /** Unique ID for the transaction. */
    id: EntityId;
    /** ID of the account this transaction belongs to. */
    accountId: EntityId;
    /** Date the transaction occurred. */
    date: ISODateString;
    /** Name of the payee or entity involved. */
    payee: string;
    /** Total amount in cents. Rule: Sum(splits) === totalAmount. */
    totalAmount: Cents;
    /** Current status in the reconciliation lifecycle. */
    status: TransactionStatus;
    /** List of splits. Must contain at least one split. */
    splits: Array<ISplit>;
    /** Optional check number for bank transactions. */
    checkNumber: string | null;
    /** SHA-256 hash for duplicate detection during imports. */
    importHash: string;
    /** ISO timestamp when the record was created. */
    createdAt: ISODateString;
    /** ISO timestamp when the record was last modified. */
    updatedAt: ISODateString;
}

/**
 * An account containing a collection of transactions.
 */
export interface IAccount {
    /** Unique ID for the account. */
    id: EntityId;
    /** Human-readable name (e.g., "Main Checking"). */
    name: string;
    /** Type of account (e.g., checking, savings). */
    type: AccountType;
    /** Financial institution name. */
    institutionName: string;
    /** Sum of all Cleared/Reconciled transactions. */
    clearedBalance: Cents;
    /** Sum of all transactions (Cleared + Pending). */
    pendingBalance: Cents;
    /** Whether the account is currently in use. */
    isActive: boolean;
    /** ISO timestamp when the record was created. */
    createdAt: ISODateString;
    /** ISO timestamp when the record was last modified. */
    updatedAt: ISODateString;
}

/**
 * Frequency interval for recurring scheduled items.
 */
export enum Frequency {
    Daily = 'daily',
    Weekly = 'weekly',
    Biweekly = 'biweekly',
    Monthly = 'monthly',
    Bimonthly = 'bimonthly',
    Quarterly = 'quarterly',
    Yearly = 'yearly',
}

/**
 * A template for generating recurring transactions.
 */
export interface IRecurringSchedule {
    /** Unique ID for the schedule. */
    id: EntityId;
    /** The account where generated transactions will be posted. */
    accountId: EntityId;
    /** Default payee for generated transactions. */
    payee: string;
    /** Default amount in cents. */
    amount: Cents;
    /** How often the transaction repeats. */
    frequency: Frequency;
    /** Date when the schedule begins. */
    startDate: ISODateString;
    /** Optional date when the schedule ends. */
    endDate: ISODateString | null;
    /** Calculated date of the next occurrence. */
    nextDueDate: ISODateString;
    /** Default category ID for the primary split. */
    categoryId: EntityId | null;
    /** Whether the schedule is active and generating projections. */
    isActive: boolean;
}
