// === Domain ===
export type {
    Cents,
    EntityId,
    ISODateString,
    ISplit,
    ITransaction,
    IAccount,
    IRecurringSchedule,
} from './domain/types';
export { TransactionStatus, AccountType, Frequency } from './domain/types';

// === Engine ===
export { TransactionEngine } from './engine/TransactionEngine';
export type { ITransactionEngine } from './engine/TransactionEngine';
export { generateProjection } from './engine/CashflowProjection';
export type {
    CashflowProjection,
    IProjectionInputs,
    IProjectionDataPoint,
    IProjectedItem,
} from './engine/CashflowProjection';
export { ProjectedItemType } from './engine/CashflowProjection';
export { validateSplitSum } from './engine/invariants';
export type { IValidationResult } from './engine/invariants';
export { generateImportHash } from './engine/hashing';

// === Parsers ===
export { QIFParser, QIFAccountType } from './parsers/QIFParser';
export type {
    IParsedTransaction,
    IParsedSplit,
    IQIFParseResult,
    IParseError,
    IParseWarning,
} from './parsers/QIFParser';

// === Shared ===
import * as Money from './shared/Money';
export { Money };
export {
    dollarsToCents,
    centsToDollars,
    formatCurrency,
    parseCurrencyInput,
} from './shared/Money';
export type { Result, IEngineError } from './shared/Result';
export { ErrorCode } from './domain/ErrorCode';
