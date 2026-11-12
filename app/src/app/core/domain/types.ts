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
 * Isomorphic timer handle that resolves to the correct type in both Node and Browser.
 */
export type TimerHandle = ReturnType<typeof setInterval>;

/**
 * Transaction status in the ledger lifecycle.
 */
export enum TransactionStatus {
    /** Imported but not yet matched or verified by the user. */
    Pending = 'pending',
    /** Matched with bank statement but not yet frozen. */
    Cleared = 'cleared',
    /** User-verified and locked; immutable for ledger integrity. */
    Reconciled = 'reconciled'
}

/**
 * Status parsed directly from external format (e.g. QIF 'C' tag).
 */
export enum QifClearedStatus {
    Cleared = 'cleared',
    Reconciled = 'reconciled',
    Uncleared = 'uncleared'
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
    PersonalLoan = 'personal_loan'
}

/**
 * Types of recurring schedules.
 */
export enum ScheduleType {
    Debit = 'debit',
    Deposit = 'deposit',
    Paycheck = 'paycheck'
}

export interface IMortgageMetadata {
    propertyAddress?: string;
    propertyValue?: Cents;
    escrowIncluded: boolean;
    escrowAmount?: Cents;
    propertyTaxAnnual?: Cents;
    homeInsuranceAnnual?: Cents;
    pmiMonthly?: Cents;
    hoaMonthly?: Cents;
}

export interface IAutoLoanMetadata {
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vin?: string;
    mileage?: number;
    purchasePrice?: Cents;
}

/**
 * Subtype classification for personal and non-collateralized loans.
 */
export enum PersonalLoanSubtype {
    Personal = 'personal',
    Student = 'student',
    HomeImprovement = 'home_improvement',
    Medical = 'medical',
    DebtConsolidation = 'debt_consolidation',
    LineOfCredit = 'line_of_credit',
    Other = 'other'
}

export interface IPersonalLoanMetadata {
    purpose?: string;
    secured: boolean;
    collateralDescription?: string;
    subtype?: PersonalLoanSubtype;
}

/**
 * Classification of a credit card promotional rate window.
 */
export enum PromotionalRateType {
    Purchase = 'purchase',
    BalanceTransfer = 'balance_transfer',
    CashAdvance = 'cash_advance',
    General = 'general'
}

/**
 * An individual promotional interest rate window on a credit card account.
 * Inspired by MS Money's rate-change tracking (`dIntRate`, `dtIntRateChg`, `dIntRateChg`)
 * and expanded to support multiple concurrent or sequential promotional offers.
 */
export interface IPromotionalRateWindow {
    /** Unique identifier for this promotional window. */
    id: EntityId;
    /** Human-readable name (e.g., "Intro 0% Balance Transfer", "12-Month Purchase Promo"). */
    name: string;
    /** Category of promotional rate offer. */
    promoType: PromotionalRateType;
    /** Promotional Annual Percentage Rate as decimal (e.g., 0 for 0%, 0.0199 for 1.99%). */
    apr: number;
    /** Optional start date of the promotional window (ISO 8601 YYYY-MM-DD). */
    startDate?: ISODateString | null;
    /** Expiration date of the promotional window (ISO 8601 YYYY-MM-DD, maps to MS Money dtIntRateChg). */
    endDate: ISODateString;
    /** Standard APR that applies after the promo expires as decimal (maps to MS Money dIntRateChg). */
    postPromoApr?: number;
    /** Optional balance in cents currently subject to this promotional window. */
    promoBalance?: Cents;
    /** Optional notes or offer terms. */
    notes?: string;
}

/**
 * Credit card terms, limits, and promotional rate schedules.
 * Captures MS Money credit card fields (`amtLimit`, `dIntRate`, `dtIntRateChg`, `dIntRateChg`,
 * `amtPayMin`, `dPayRateMin`, `dtNextDebtPay`) plus multi-window promotional tracking.
 */
export interface ICreditCardDetails {
    /** Credit limit in cents (always positive, maps to abs(MS Money amtLimit)). */
    creditLimit?: Cents;
    /** Standard Purchase Annual Percentage Rate as decimal (e.g., 0.2924 = 29.24%). */
    interestRate: number;
    /** Day of month payment is due (1-31). */
    paymentDueDay?: number;
    /** Minimum monthly dollar payment floor in cents (maps to MS Money amtPayMin). */
    minimumPayment?: Cents;
    /** Minimum monthly payment percentage as decimal (e.g., 0.02 = 2%, maps to MS Money dPayRateMin). */
    minimumPaymentPercentage?: number;
    /** Cash advance APR as decimal. */
    cashAdvanceApr?: number;
    /** Annual fee in cents. */
    annualFee?: Cents;
    /** Individual promotional rate windows tracked for this card. */
    promotionalRates: Array<IPromotionalRateWindow>;
}

export interface ILoanDetails {
    /** Original principal amount in cents (always positive, maps to abs(MS Money amtOpen)). */
    originalAmount: Cents;
    /** Annual Percentage Rate as decimal (e.g., 0.0375 = 3.75%, maps to MS Money dIntRate / rateUser). */
    interestRate: number;
    /** Total loan term in months (maps to MS Money iPmtMax). */
    termMonths: number;
    /** Scheduled total monthly payment amount in cents (P&I + Escrow, maps to abs(MS Money amtPayment)). */
    monthlyPayment: Cents;
    /** Principal & Interest portion of the scheduled payment in cents (maps to abs(MS Money amtPI)). */
    principalAndInterestPayment?: Cents;
    /** Final balloon payment amount in cents if applicable (maps to abs(MS Money amtBalloon)). */
    balloonAmount?: Cents;
    /** Day of month payment is due (1-31). */
    paymentDueDay: number;
    /** Loan origination date (ISO 8601 YYYY-MM-DD, maps to MS Money dtOpen). */
    startDate: ISODateString;
    /** Payment schedule frequency (defaults to Monthly, maps to MS Money frq). */
    paymentFrequency?: Frequency;
    /** Compounding frequency (defaults to Monthly, maps to MS Money frqCpd). */
    compoundingFrequency?: Frequency;
    /** True if Adjustable Rate Loan / ARM (maps to MS Money fARM). */
    isAdjustableRate?: boolean;
    /** Next rate adjustment date for ARM loans (ISO 8601 YYYY-MM-DD, maps to MS Money dtNextAdj). */
    nextRateAdjustmentDate?: ISODateString | null;
    /** Post-adjustment interest rate as decimal if known (maps to MS Money dIntRateChg). */
    nextAdjustmentRate?: number;
    /** Linked asset or escrow account ID (maps to MS Money hacctRel). */
    linkedAssetAccountId?: EntityId | null;
    /** Default interest expense category ID (maps to MS Money hcatInterest). */
    interestCategoryId?: EntityId | null;
    /** Type-specific metadata. */
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
    /** Optional ID of a linked transfer record if this transaction is part of a cross-account transfer. */
    linkedTransferId?: EntityId;
}

/**
 * A cross-account transfer connecting two transactions.
 */
export interface ITransfer {
    /** Unique ID for the transfer record. */
    id: EntityId;
    /** Date the transfer occurred. */
    date: ISODateString;
    /** Amount of the transfer (positive absolute value). */
    amount: Cents;
    /** ID of the source account. */
    fromAccountId: EntityId;
    /** ID of the destination account. */
    toAccountId: EntityId;
    /** ID of the transaction recorded in the source account. */
    fromTransactionId: EntityId;
    /** ID of the transaction recorded in the destination account. */
    toTransactionId: EntityId;
    /** Snapshot of the source account name in case it is deleted. */
    fromAccountNameSnapshot: string;
    /** Snapshot of the destination account name in case it is deleted. */
    toAccountNameSnapshot: string;
    /** Optional memo for the transfer. */
    memo: string;
    /** ISO timestamp when the record was created. */
    createdAt: ISODateString;
    /** ISO timestamp when the record was last modified. */
    updatedAt: ISODateString;
    /** ISO timestamp when the record was soft-deleted (null if active). */
    deletedAt: ISODateString | null;
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
    /** Optional account number or last-4 digits (MS Money mNum). */
    accountNumber?: string | null;
    /** Optional short abbreviation/code (MS Money szAls). */
    abbreviation?: string | null;
    /** Optional initial opening balance in cents (MS Money amtOpen). */
    openingBalance?: Cents;
    /** Optional account opening date (MS Money dtOpen). */
    openingDate?: ISODateString | null;
    /** Optional user notes/comments (MS Money mComment). */
    notes?: string | null;
    /** True if marked as a favorite/pinned account (MS Money fFavorite). */
    isFavorite?: boolean;
    /** True if account is tax-related (MS Money fTaxRel). */
    isTaxRelated?: boolean;
    /** Linked account ID (e.g., Asset/Home account or Cash account in MS Money hacctRel). */
    linkedAccountId?: EntityId | null;
    /** Optional detailed information for credit card accounts (APR, limit, promotional rate windows). */
    creditCardDetails?: ICreditCardDetails;
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
    Yearly = 'yearly'
}

/**
 * Payment methods for scheduled transactions.
 */
export enum PaymentMethod {
    DirectDebit = 'direct_debit',
    DirectDeposit = 'direct_deposit',
    WriteCheck = 'write_check',
    ElectronicTransfer = 'electronic_transfer',
    Other = 'other'
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

/**
 * Result of parsing a single split from an external source (e.g. QIF).
 */
export interface IParsedSplit {
    category: string | null;
    mnyCategoryId?: number | null;
    amount: Cents;
    memo: string | null;
}

/**
 * Result of parsing a single transaction from an external source (e.g. QIF).
 */
export interface IParsedTransaction {
    date: ISODateString;
    amount: Cents;
    payee: string;
    memo: string;
    checkNumber: string | null;
    category: string | null;
    mnyCategoryId?: number | null;
    splits: Array<IParsedSplit>;
    importHash: string;
    clearedStatus?: QifClearedStatus;
}
