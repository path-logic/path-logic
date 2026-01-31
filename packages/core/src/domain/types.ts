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
    Mortgage = 'mortgage',
    AutoLoan = 'auto_loan',
    PersonalLoan = 'personal_loan',
}

/**
 * Types of recurring schedules.
 */
export enum ScheduleType {
    Debit = 'debit',
    Deposit = 'deposit',
    Paycheck = 'paycheck',
}

export interface IMortgageMetadata {
    propertyAddress?: string;
    propertyValue?: Cents;
    escrowIncluded: boolean;
    escrowAmount?: Cents;
}

export interface IAutoLoanMetadata {
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vin?: string;
}

export interface IPersonalLoanMetadata {
    purpose?: string;
    secured: boolean;
}

export interface ILoanDetails {
    /** Original principal amount in cents */
    originalAmount: Cents;
    /** Annual Percentage Rate as decimal (e.g., 0.0375 = 3.75%) */
    interestRate: number;
    /** Total loan term in months */
    termMonths: number;
    /** Monthly payment amount in cents */
    monthlyPayment: Cents;
    /** Day of month payment is due (1-31) */
    paymentDueDay: number;
    /** Loan origination date */
    startDate: ISODateString;
    /** Type-specific metadata */
    metadata?: IMortgageMetadata | IAutoLoanMetadata | IPersonalLoanMetadata;
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
    /** Mandatory ID of the payee entity. */
    payeeId: EntityId;
    /** Date the transaction occurred. */
    date: ISODateString;
    /** Name of the payee or entity involved (cached for performance). */
    payee: string;
    /** Optional descriptive text for the transaction. */
    memo: string;
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
 * An entity that receives or pays money.
 */
export interface IPayee {
    /** Unique ID for the payee. */
    id: EntityId;
    /** Human-readable name (e.g., "Starbucks"). */
    name: string;
    /** Geographical Address. */
    address: string | null;
    /** City location. */
    city: string | null;
    /** State/Province. */
    state: string | null;
    /** Postal/Zip code. */
    zipCode: string | null;
    /** Coordinate for map visualization. */
    latitude: number | null;
    /** Coordinate for map visualization. */
    longitude: number | null;
    /** Official website or portal. */
    website: string | null;
    /** Contact phone number. */
    phone: string | null;
    /** Arbitrary notes about this payee. */
    notes: string | null;
    /** Default category ID suggested for new transactions. */
    defaultCategoryId: EntityId | null;
    /** ISO timestamp when the record was created. */
    createdAt: ISODateString;
    /** ISO timestamp when the record was last modified. */
    updatedAt: ISODateString;
}

/**
 * A category for organizing transactions (e.g., "Groceries", "Rent").
 * Supports a hierarchical tree structure.
 */
export interface ICategory {
    /** Unique ID for the category. */
    id: EntityId;
    /** ID of the parent category (null if top-level). */
    parentId: EntityId | null;
    /** Name of the category (e.g., "Dining Out"). */
    name: string;
    /** Optional detailed description. */
    description: string | null;
    /** Whether the category is currently available for selection. */
    isActive: boolean;
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
    /** ISO timestamp when the record was soft-deleted (null if active). */
    deletedAt: ISODateString | null;
    /** Optional detailed information for loan accounts. */
    loanDetails?: ILoanDetails;
}

/**
 * Frequency interval for recurring scheduled items.
 */
export enum Frequency {
    Daily = 'daily',
    Weekly = 'weekly',
    Biweekly = 'biweekly',
    EveryFourWeeks = 'every_four_weeks',
    Monthly = 'monthly',
    TwiceAMonth = 'twice_a_month',
    Bimonthly = 'bimonthly',
    Quarterly = 'quarterly',
    Yearly = 'yearly',
}

/**
 * Payment methods for scheduled transactions.
 */
export enum PaymentMethod {
    DirectDebit = 'direct_debit',
    DirectDeposit = 'direct_deposit',
    WriteCheck = 'write_check',
    ElectronicTransfer = 'electronic_transfer',
    Other = 'other',
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
    /** Total amount for the transaction (parent). */
    amount: Cents;
    /** The type of schedule (Debit, Deposit, Paycheck). */
    type: ScheduleType;
    /** How often the transaction repeats. */
    frequency: Frequency;
    /** How the payment is processed. */
    paymentMethod: PaymentMethod;
    /** Date when the schedule begins. */
    startDate: ISODateString;
    /** Optional date when the schedule ends. */
    endDate: ISODateString | null;
    /** Calculated date of the next occurrence. */
    nextDueDate: ISODateString;
    /** Date when the last transaction was posted from this schedule. */
    lastOccurredDate: ISODateString | null;
    /** Splits for the generated transaction. */
    splits: Array<ISplit>;
    /** Optional memo for the transaction. */
    memo: string;
    /** Whether to automatically post the transaction to the ledger on the due date. */
    autoPost: boolean;
    /** Whether the schedule is active and generating projections. */
    isActive: boolean;
}
