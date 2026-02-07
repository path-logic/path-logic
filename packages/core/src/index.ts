// === Domain ===
export type { ICategorySeed } from './domain/CategoryDefaults';
export { DEFAULT_CATEGORIES, KnownCategory } from './domain/CategoryDefaults';
export { ErrorCode } from './domain/ErrorCode';
export type {
    Cents,
    EntityId,
    IAccount,
    IAutoLoanMetadata,
    ICategory,
    ILoanDetails,
    IMortgageMetadata,
    IParsedSplit,
    IParsedTransaction,
    IPayee,
    IPersonalLoanMetadata,
    IRecurringSchedule,
    ISODateString,
    ISplit,
    ITransaction,
    TimerHandle,
} from './domain/types';
export {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    TransactionStatus,
} from './domain/types';

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
export type { IReconciliationMatch } from './engine/ReconciliationEngine';
export { ReconciliationEngine } from './engine/ReconciliationEngine';
export { RecurringEngine } from './engine/RecurringEngine';
export type {
    IMortgageParams,
    IPaycheckParams,
    ITransactionEngine,
} from './engine/TransactionEngine';
export { TransactionEngine } from './engine/TransactionEngine';

// === Parsers ===
export { QIFExporter } from './parsers/QIFExporter';
export type { IParseError, IParseWarning, IQIFParseResult } from './parsers/QIFParser';
export { QIFAccountType, QIFParser } from './parsers/QIFParser';

// === Utils ===
export { formatLocaleDate } from './utils/dateUtils';
export * as LoanCalculations from './utils/loanCalculations';
export * as TypeGuards from './utils/typeGuards';

// === Shared ===
export { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './shared/Money';
export type { IEngineError, Result } from './shared/Result';
import * as Money from './shared/Money';
export { Money };
