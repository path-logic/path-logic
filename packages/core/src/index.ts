// === Domain ===
export type { ICategorySeed } from './domain/CategoryDefaults';
export { DEFAULT_CATEGORIES, KnownCategory } from './domain/CategoryDefaults';
export type {
    Cents,
    EntityId,
    IAccount,
    IAutoLoanMetadata,
    ICategory,
    ILoanDetails,
    IMortgageMetadata,
    IPayee,
    IPersonalLoanMetadata,
    IRecurringSchedule,
    ISODateString,
    ISplit,
    ITransaction,
} from './domain/types';
export {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    TransactionStatus,
} from './domain/types';
export { RecurringEngine } from './engine/RecurringEngine';

// === Utils ===
export { formatLocaleDate } from './utils/dateUtils';
export * as LoanCalculations from './utils/loanCalculations';
export * as TypeGuards from './utils/typeGuards';

// === Engine ===
export type {
    CashflowProjection,
    IProjectedItem,
    IProjectionDataPoint,
    IProjectionInputs,
} from './engine/CashflowProjection';
export { generateProjection, ProjectedItemType } from './engine/CashflowProjection';
export { generateImportHash } from './engine/hashing';
export type { IValidationResult } from './engine/invariants';
export { validateSplitSum } from './engine/invariants';
export type { ITransactionEngine } from './engine/TransactionEngine';
export { TransactionEngine } from './engine/TransactionEngine';

// === Parsers ===
export { ErrorCode } from './domain/ErrorCode';
export type {
    IParsedSplit,
    IParsedTransaction,
    IParseError,
    IParseWarning,
    IQIFParseResult,
} from './parsers/QIFParser';
export { QIFAccountType, QIFParser } from './parsers/QIFParser';
export { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './shared/Money';
export type { IEngineError, Result } from './shared/Result';
// === Shared ===
import * as Money from './shared/Money';
export { Money };
