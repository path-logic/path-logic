// === Domain ===
export { DEFAULT_CATEGORIES, KnownCategory } from './domain/CategoryDefaults';
export type { ICategorySeed } from './domain/CategoryDefaults';
export { ErrorCode } from './domain/ErrorCode';
export {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    TransactionStatus
} from './domain/types';
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
    TimerHandle
} from './domain/types';

// === Engine ===
export { ProjectedItemType, generateProjection } from './engine/CashflowProjection';
export type {
    CashflowProjection,
    IProjectedItem,
    IProjectionDataPoint,
    IProjectionInputs
} from './engine/CashflowProjection';
export { generateImportHash } from './engine/hashing';
export { validateSplitSum } from './engine/invariants';
export type { IValidationResult } from './engine/invariants';
export { ReconciliationEngine } from './engine/ReconciliationEngine';
export type { IReconciliationMatch } from './engine/ReconciliationEngine';
export { RecurringEngine } from './engine/RecurringEngine';
export { detectRecurringPatterns } from './engine/RecurringDetector';
export type { IDetectedPattern } from './engine/RecurringDetector';
export { TransactionEngine } from './engine/TransactionEngine';
export type {
    IMortgageParams,
    IPaycheckParams,
    ITransactionEngine
} from './engine/TransactionEngine';

// === Parsers ===
export { QIFExporter } from './parsers/QIFExporter';
export { QIFAccountType, QIFParser } from './parsers/QIFParser';
export type { IParseError, IParseWarning, IQIFParseResult } from './parsers/QIFParser';

// === Utils ===
export { cleanExpression, evalArithmetic, tokenize, tryEvalArithmetic } from './utils/arithmetic';
export { formatLocaleDate } from './utils/dateUtils';
export * as LoanCalculations from './utils/loanCalculations';
export * as TypeGuards from './utils/typeGuards';

// === Shared ===
export { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './shared/Money';
export type { IEngineError, Result } from './shared/Result';
export { Money };
import * as Money from './shared/Money';
