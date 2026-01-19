// === Domain ===
export { DEFAULT_CATEGORIES, KnownCategory } from './domain/CategoryDefaults';
export type { ICategorySeed } from './domain/CategoryDefaults';
export { AccountType, Frequency, TransactionStatus } from './domain/types';
export type {
    Cents,
    EntityId,
    IAccount,
    ICategory,
    IPayee,
    IRecurringSchedule,
    ISODateString,
    ISplit,
    ITransaction
} from './domain/types';

// === Engine ===
export { generateProjection, ProjectedItemType } from './engine/CashflowProjection';
export type {
    CashflowProjection,
    IProjectedItem,
    IProjectionDataPoint,
    IProjectionInputs
} from './engine/CashflowProjection';
export { generateImportHash } from './engine/hashing';
export { validateSplitSum } from './engine/invariants';
export type { IValidationResult } from './engine/invariants';
export { TransactionEngine } from './engine/TransactionEngine';
export type { ITransactionEngine } from './engine/TransactionEngine';

// === Parsers ===
export { ErrorCode } from './domain/ErrorCode';
export { QIFAccountType, QIFParser } from './parsers/QIFParser';
export type {
    IParsedSplit,
    IParsedTransaction,
    IParseError,
    IParseWarning,
    IQIFParseResult
} from './parsers/QIFParser';
export { centsToDollars, dollarsToCents, formatCurrency, parseCurrencyInput } from './shared/Money';
export type { IEngineError, Result } from './shared/Result';
export { Money };

// === Shared ===
import * as Money from './shared/Money';

