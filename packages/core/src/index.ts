// === Domain ===
export type {
    Cents,
    EntityId,
    IAccount,
    IRecurringSchedule,
    ISODateString,
    ISplit,
    ITransaction,
} from './domain/types';
export { AccountType, Frequency, TransactionStatus } from './domain/types';

// === Engine ===
export type {
    CashflowProjection,
    IProjectedItem,
    IProjectionDataPoint,
    IProjectionInputs,
} from './engine/CashflowProjection';
export { generateProjection } from './engine/CashflowProjection';
export { ProjectedItemType } from './engine/CashflowProjection';
export { generateImportHash } from './engine/hashing';
export type { IValidationResult } from './engine/invariants';
export { validateSplitSum } from './engine/invariants';
export type { ITransactionEngine } from './engine/TransactionEngine';
export { TransactionEngine } from './engine/TransactionEngine';

// === Parsers ===
export type {
    IParsedSplit,
    IParsedTransaction,
    IParseError,
    IParseWarning,
    IQIFParseResult,
} from './parsers/QIFParser';
export { QIFAccountType, QIFParser } from './parsers/QIFParser';

// === Shared ===
import * as Money from './shared/Money';
export { Money };
export { ErrorCode } from './domain/ErrorCode';
export { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './shared/Money';
export type { IEngineError, Result } from './shared/Result';
