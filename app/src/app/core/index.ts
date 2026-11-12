// === Domain ===
export { DEFAULT_ALIASES, DEFAULT_CATEGORIES, KnownCategory } from './domain/CategoryDefaults';
export type { ICategorySeed } from './domain/CategoryDefaults';
export { ErrorCode } from './domain/ErrorCode';
export {
    AccountType,
    Frequency,
    PaymentMethod,
    PersonalLoanSubtype,
    PromotionalRateType,
    QifClearedStatus,
    ScheduleType,
    TransactionStatus
} from './domain/types';
export type {
    Cents,
    EntityId,
    IAccount,
    IAutoLoanMetadata,
    ICategory,
    ICreditCardDetails,
    ILoanDetails,
    IMortgageMetadata,
    IParsedSplit,
    IParsedTransaction,
    IPayee,
    IPersonalLoanMetadata,
    IPromotionalRateWindow,
    IRecurringSchedule,
    ISODateString,
    ISplit,
    ITransaction,
    ITransfer,
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
export { detectRecurringPatterns } from './engine/RecurringDetector';
export type { IDetectedPattern } from './engine/RecurringDetector';
export { RecurringEngine } from './engine/RecurringEngine';
export { TransactionEngine } from './engine/TransactionEngine';
export type {
    IMortgageParams,
    IPaycheckParams,
    ITransactionEngine
} from './engine/TransactionEngine';

// === Parsers ===
export {
    MNYParser,
    MnyAccountType,
    MnyClearedState,
    MnyColumnType,
    MnyEncryptionFlag,
    md5Digest,
    rc4Transform,
    sha1Digest
} from './parsers/MNYParser';
export type {
    IMnyAccount,
    IMnyCatalogTable,
    IMnyCategory,
    IMnyColumnDef,
    IMnyHeader,
    IMnyParseResult,
    IMnyPayee,
    IMnyTableDef,
    IMnyTransaction,
    MnyCellValue
} from './parsers/MNYParser';
export { QIFExporter } from './parsers/QIFExporter';
export { QIFAccountType, QIFParser, resolveImportTransactionStatus } from './parsers/QIFParser';
export type { IParseError, IParseWarning, IQIFParseResult } from './parsers/QIFParser';

// === Utils ===
export { cleanExpression, evalArithmetic, tokenize, tryEvalArithmetic } from './utils/arithmetic';
export { GLOBAL_DATE_FORMAT, formatLocaleDate } from './utils/dateUtils';
export * as LoanCalculations from './utils/loanCalculations';
export * as TypeGuards from './utils/typeGuards';

// === Shared ===
export { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './shared/Money';
export type { IEngineError, Result } from './shared/Result';
export { Money };
import * as Money from './shared/Money';
