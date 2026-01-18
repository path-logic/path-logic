# Penny Perfect Core Engine — Technical Specification

> **Version:** 1.0.0  
> **Status:** Draft  
> **Author:** Principal Full-Stack Engineer  
> **Date:** 2026-01-16

---

## 1. Overview

The **Penny Perfect Core Engine** is the transaction management subsystem of Path Logic. It provides mathematically rigorous, split-transaction accounting with zero tolerance for floating-point errors.

### 1.1 Design Principles

| Principle                  | Implementation                                                        |
| -------------------------- | --------------------------------------------------------------------- |
| **Hexagonal Architecture** | Pure TypeScript domain logic with zero framework dependencies         |
| **Integer-Based Math**     | All monetary values stored as cents (integers) or via Big.js          |
| **Immutable State**        | Zustand + Immer for ledger updates                                    |
| **Privacy-First**          | Engine operates on decrypted data in memory; never persists plaintext |

---

## 2. Domain Model

### 2.1 Core Entities

```typescript
// src/core/domain/types.ts

/**
 * Monetary amount in CENTS (integer).
 * $100.00 = 10000. Never use floating-point for money.
 */
type Cents = number;

/**
 * Unique identifier for all entities.
 * Format: UUIDv4
 */
type EntityId = string;

/**
 * ISO 8601 date string (YYYY-MM-DD)
 */
type ISODateString = string;

/**
 * Transaction status in the ledger lifecycle
 */
enum TransactionStatus {
    Pending = 'pending', // Imported but not reconciled
    Cleared = 'cleared', // Matched with bank statement
    Reconciled = 'reconciled', // User-verified and locked
}

/**
 * Account classification for balance calculations
 */
enum AccountType {
    Checking = 'checking',
    Savings = 'savings',
    Credit = 'credit',
    Cash = 'cash',
}
```

### 2.2 Transaction Entity (Aggregate Root)

```typescript
// src/core/domain/Transaction.ts

interface ISplit {
    id: EntityId;
    categoryId: EntityId | null;
    memo: string;
    amount: Cents; // Can be negative (e.g., tax deduction in paycheck)
}

interface ITransaction {
    id: EntityId;
    accountId: EntityId;
    date: ISODateString;
    payee: string;
    totalAmount: Cents;
    status: TransactionStatus;
    splits: Array<ISplit>;
    checkNumber: string | null;
    importHash: string; // For deduplication
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
```

### 2.3 Account Entity

```typescript
// src/core/domain/Account.ts

interface IAccount {
    id: EntityId;
    name: string;
    type: AccountType;
    institutionName: string;
    clearedBalance: Cents; // Sum of cleared transactions
    pendingBalance: Cents; // Cleared + pending transactions
    isActive: boolean;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
```

### 2.4 Recurring Schedule Entity

```typescript
// src/core/domain/RecurringSchedule.ts

enum Frequency {
    Daily = 'daily',
    Weekly = 'weekly',
    Biweekly = 'biweekly',
    Monthly = 'monthly',
    Quarterly = 'quarterly',
    Yearly = 'yearly',
}

interface IRecurringSchedule {
    id: EntityId;
    accountId: EntityId;
    payee: string;
    amount: Cents;
    frequency: Frequency;
    startDate: ISODateString;
    endDate: ISODateString | null;
    nextDueDate: ISODateString;
    categoryId: ISODateString | null;
    isActive: boolean;
}
```

---

## 3. Core Invariants & Business Rules

### 3.1 The Split-Sum Invariant

> **INVARIANT:** `Sum(transaction.splits[].amount) === transaction.totalAmount`

This is the foundational integrity constraint. Every transaction MUST satisfy this invariant at all times.

### 3.2 The "Income First" Daily Sort Strategy

To provide a conservative and useful running balance, transactions on the same day MUST be sorted such that income (deposits) are processed before expenses (withdrawals).

> **Sort Priority:**
> 1. **Date** (Chronological)
> 2. **Transaction Type** (Income > Expense)
> 
> **Implementation**: Positive amounts have higher priority than negative amounts for transactions sharing the same `ISODateString`.

```typescript
// src/core/engine/invariants.ts

function validateSplitSum(transaction: ITransaction): IValidationResult {
    const splitSum = transaction.splits.reduce((sum, split) => sum + split.amount, 0);

    if (splitSum !== transaction.totalAmount) {
        return {
            valid: false,
            error: `Split sum (${splitSum}) !== Total (${transaction.totalAmount})`,
            discrepancy: transaction.totalAmount - splitSum,
        };
    }

    return { valid: true };
}
```

### 3.2 Negative Splits in Positive Transactions

The engine explicitly supports negative split amounts within a positive transaction total. This handles real-world scenarios:

| Scenario                       | Total      | Splits                                                                 |
| ------------------------------ | ---------- | ---------------------------------------------------------------------- |
| **Paycheck Deposit**           | +$2,000.00 | Gross: +$2,800, Federal Tax: -$400, State Tax: -$200, Insurance: -$200 |
| **Refund with Restocking Fee** | +$85.00    | Original Refund: +$100, Restocking Fee: -$15                           |

### 3.3 Deduplication Hash

Every imported transaction generates a deterministic hash for duplicate detection:

```typescript
// src/core/engine/hashing.ts

import { createHash } from 'crypto';

function generateImportHash(date: ISODateString, amount: Cents, payee: string): string {
    const normalized = `${date}|${amount}|${payee.toLowerCase().trim()}`;
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

---

## 4. Transaction Engine API

### 4.1 Public Interface

```typescript
// src/core/engine/TransactionEngine.ts

interface ITransactionEngine {
    // === Mutations ===
    createTransaction(input: ICreateTransactionInput): Result<ITransaction>;
    updateTransaction(id: EntityId, input: IUpdateTransactionInput): Result<ITransaction>;
    deleteTransaction(id: EntityId): Result<void>;

    // === Split Operations ===
    addSplit(transactionId: EntityId, split: Omit<ISplit, 'id'>): Result<ITransaction>;
    updateSplit(
        transactionId: EntityId,
        splitId: EntityId,
        input: Partial<ISplit>,
    ): Result<ITransaction>;
    removeSplit(transactionId: EntityId, splitId: EntityId): Result<ITransaction>;
    autoBalanceSplits(transactionId: EntityId): Result<ITransaction>;

    // === Status Transitions ===
    markCleared(id: EntityId): Result<ITransaction>;
    markReconciled(ids: Array<EntityId>): Result<Array<ITransaction>>;

    // === Queries ===
    getById(id: EntityId): ITransaction | null;
    getByAccount(accountId: EntityId, options?: IQueryOptions): Array<ITransaction>;
    getByDateRange(start: ISODateString, end: ISODateString): Array<ITransaction>;
    findDuplicates(importHash: string): Array<ITransaction>;
}
```

### 4.2 Result Type (Functional Error Handling)

```typescript
// src/core/shared/Result.ts

type Result<T, E = IEngineError> = { success: true; value: T } | { success: false; error: E };

interface IEngineError {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}

enum ErrorCode {
    SplitSumMismatch = 'SPLIT_SUM_MISMATCH',
    TransactionNotFound = 'TRANSACTION_NOT_FOUND',
    InvalidAmount = 'INVALID_AMOUNT',
    DuplicateImport = 'DUPLICATE_IMPORT',
    ReconciledImmutable = 'RECONCILED_IMMUTABLE',
}
```

### 4.3 Auto-Balance Algorithm

When modifying splits, the engine can automatically balance discrepancies:

```typescript
// src/core/engine/TransactionEngine.ts

function autoBalanceSplits(transaction: ITransaction): ITransaction {
    const currentSum = transaction.splits.reduce((s, sp) => s + sp.amount, 0);
    const discrepancy = transaction.totalAmount - currentSum;

    if (discrepancy === 0) return transaction;

    // Strategy: Add discrepancy to the last split (or create "Uncategorized" split)
    if (transaction.splits.length === 0) {
        return {
            ...transaction,
            splits: [
                {
                    id: generateUUID(),
                    categoryId: null,
                    memo: 'Auto-balanced',
                    amount: discrepancy,
                },
            ],
        };
    }

    const lastIndex = transaction.splits.length - 1;
    const updatedSplits: Array<ISplit> = [...transaction.splits];
    updatedSplits[lastIndex] = {
        ...updatedSplits[lastIndex],
        amount: updatedSplits[lastIndex].amount + discrepancy,
    };

    return { ...transaction, splits: updatedSplits };
}
```

---

## 5. Cashflow Projection Engine

### 5.1 Algorithm Specification

The 90-Day Cashflow Projection Engine generates a forward-looking balance forecast.

**Inputs:**

- `currentClearedBalance: Cents` — Starting balance
- `pendingTransactions: Array<ITransaction>` — Uncleared ledger items
- `recurringSchedules: Array<IRecurringSchedule>` — Future scheduled items

**Output:**

```typescript
enum ProjectedItemType {
    Pending = 'pending',
    Recurring = 'recurring',
}

interface IProjectionDataPoint {
    date: ISODateString;
    projectedBalance: Cents;
    delta: Cents; // Change from previous day
    items: Array<IProjectedItem>; // Transactions affecting this day
}

interface IProjectedItem {
    type: ProjectedItemType;
    description: string;
    amount: Cents;
    sourceId: string;
}

type CashflowProjection = Array<IProjectionDataPoint>;
```

### 5.2 Projection Algorithm

```typescript
// src/core/engine/CashflowProjection.ts

function generateProjection(
    startDate: ISODateString,
    days: number,
    inputs: IProjectionInputs,
): CashflowProjection {
    const { clearedBalance, pendingTransactions, recurringSchedules } = inputs;

    const projection: CashflowProjection = new Array<IProjectionDataPoint>();
    let runningBalance = clearedBalance;

    for (let i = 0; i < days; i++) {
        const currentDate = addDays(startDate, i);
        const items: Array<IProjectedItem> = new Array<IProjectedItem>();
        let dailyDelta = 0;

        // 1. Add pending transactions due on this date
        for (const tx of pendingTransactions) {
            if (tx.date === currentDate) {
                dailyDelta += tx.totalAmount;
                items.push({
                    type: ProjectedItemType.Pending,
                    description: tx.payee,
                    amount: tx.totalAmount,
                    sourceId: tx.id,
                });
            }
        }

        // 2. Add recurring items due on this date
        for (const schedule of recurringSchedules) {
            if (isDueOnDate(schedule, currentDate)) {
                dailyDelta += schedule.amount;
                items.push({
                    type: ProjectedItemType.Recurring,
                    description: schedule.payee,
                    amount: schedule.amount,
                    sourceId: schedule.id,
                });
            }
        }

        runningBalance += dailyDelta;

        projection.push({
            date: currentDate,
            projectedBalance: runningBalance,
            delta: dailyDelta,
            items,
        });
    }

    return projection;
}
```

### 5.3 Recurring Schedule Matcher

```typescript
// src/core/engine/scheduling.ts

function isDueOnDate(schedule: IRecurringSchedule, date: ISODateString): boolean {
    if (!schedule.isActive) return false;
    if (date < schedule.startDate) return false;
    if (schedule.endDate && date > schedule.endDate) return false;

    const daysDiff = differenceInDays(date, schedule.startDate);

    switch (schedule.frequency) {
        case Frequency.Daily:
            return true;
        case Frequency.Weekly:
            return daysDiff % 7 === 0;
        case Frequency.Biweekly:
            return daysDiff % 14 === 0;
        case Frequency.Monthly:
            return getDayOfMonth(date) === getDayOfMonth(schedule.startDate);
        case Frequency.Quarterly:
            return isQuarterlyMatch(date, schedule.startDate);
        case Frequency.Yearly:
            return isYearlyMatch(date, schedule.startDate);
        default:
            return false;
    }
}
```

---

## 6. QIF/CSV Parser Specification

### 6.1 QIF Format Support

The parser handles legacy Quicken Interchange Format with defensive parsing:

| Field | Description             | Example                            |
| ----- | ----------------------- | ---------------------------------- |
| `D`   | Date (multiple formats) | `1/15'26`, `01/15/2026`, `1-15-26` |
| `T`   | Amount                  | `-500.00`, `1,234.56`              |
| `P`   | Payee                   | `AMAZON.COM`                       |
| `N`   | Check number            | `1234`                             |
| `M`   | Memo                    | `Office supplies`                  |
| `L`   | Category                | `Business:Supplies`                |
| `S`   | Split category          | (multi-line with `$` and `E`)      |
| `^`   | End of record           |                                    |

### 6.2 Parser Interface

```typescript
// src/core/parsers/QIFParser.ts

enum QIFAccountType {
    Bank = 'Bank',
    CCard = 'CCard',
    Cash = 'Cash',
}

interface IParsedTransaction {
    date: ISODateString;
    amount: Cents;
    payee: string;
    memo: string;
    checkNumber: string | null;
    category: string | null;
    splits: Array<IParsedSplit>;
    importHash: string;
}

interface IQIFParseResult {
    transactions: Array<IParsedTransaction>;
    accountType: QIFAccountType;
    errors: Array<IParseError>;
    warnings: Array<IParseWarning>;
}

interface IQIFParser {
    parse(content: string): IQIFParseResult;
    detectEncoding(buffer: ArrayBuffer): string;
    normalizeDate(raw: string): ISODateString;
}
```

### 6.3 Date Normalization

```typescript
// src/core/parsers/dateNormalizer.ts

const DATE_PATTERNS = [
    /^(\d{1,2})\/(\d{1,2})'(\d{2})$/, // M/D'YY (Quicken)
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // M/D/YY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // M-D-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD (ISO)
];

function normalizeDate(raw: string): ISODateString {
    for (const pattern of DATE_PATTERNS) {
        const match = raw.match(pattern);
        if (match) {
            return parseMatchToISO(match, pattern);
        }
    }
    throw new ParseError('INVALID_DATE', `Unrecognized date format: ${raw}`);
}

// Handle 2-digit year pivot (00-49 = 2000s, 50-99 = 1900s)
function expandYear(twoDigit: string): number {
    const yy = parseInt(twoDigit, 10);
    return yy < 50 ? 2000 + yy : 1900 + yy;
}
```

---

## 7. File Structure

```
src/
└── core/                          # Framework-agnostic domain layer
    ├── domain/                    # Entity definitions
    │   ├── types.ts              # Shared type aliases
    │   ├── Transaction.ts        # Transaction aggregate
    │   ├── Account.ts            # Account entity
    │   ├── Category.ts           # Category entity
    │   └── RecurringSchedule.ts  # Recurring schedule entity
    │
    ├── engine/                    # Business logic
    │   ├── TransactionEngine.ts  # Transaction CRUD & validation
    │   ├── CashflowProjection.ts # 90-day forecast
    │   ├── invariants.ts         # Business rule validators
    │   ├── hashing.ts            # Import hash generation
    │   └── scheduling.ts         # Recurring item calculations
    │
    ├── parsers/                   # Import format handlers
    │   ├── QIFParser.ts          # QIF format parser
    │   ├── CSVParser.ts          # Generic CSV parser
    │   └── dateNormalizer.ts     # Date format utilities
    │
    └── shared/                    # Cross-cutting utilities
        ├── Result.ts             # Functional error handling
        ├── Money.ts              # Cents ↔ display conversions
        └── uuid.ts               # ID generation
```

---

## 8. Integer Math & Display Layer

### 8.1 Money Utilities

```typescript
// src/core/shared/Money.ts

export function dollarsToCents(dollars: number): Cents {
    return Math.round(dollars * 100);
}

export function centsToDollars(cents: Cents): number {
    return cents / 100;
}

export function formatCurrency(cents: Cents, locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
    }).format(cents / 100);
}

export function parseCurrencyInput(input: string): Cents {
    // Remove currency symbols, commas, whitespace
    const cleaned = input.replace(/[$,\s]/g, '');
    const dollars = parseFloat(cleaned);

    if (isNaN(dollars)) {
        throw new Error(`Invalid currency input: ${input}`);
    }

    return dollarsToCents(dollars);
}
```

---

## 9. Test Coverage Requirements

| Module               | Target Coverage | Critical Paths                             |
| -------------------- | --------------- | ------------------------------------------ |
| `TransactionEngine`  | 100%            | Split-sum validation, status transitions   |
| `CashflowProjection` | 100%            | Daily aggregation, recurring matcher       |
| `QIFParser`          | 95%+            | Date formats, split transactions, encoding |
| `Money`              | 100%            | Conversion accuracy, rounding              |

### 9.1 Critical Test Cases

```typescript
// Example: Split-sum invariant enforcement
describe('TransactionEngine', () => {
    it('rejects transactions where splits do not sum to total', () => {
        const result = engine.createTransaction({
            totalAmount: 10000, // $100.00
            splits: [
                { amount: 6000, categoryId: 'cat-1' },
                { amount: 3000, categoryId: 'cat-2' },
                // Missing $10.00!
            ],
        });

        expect(result.success).toBe(false);
        expect(result.error.code).toBe(ErrorCode.SplitSumMismatch);
    });

    it('allows negative splits in positive transactions', () => {
        const result = engine.createTransaction({
            totalAmount: 200000, // $2,000.00 paycheck
            splits: [
                { amount: 280000, categoryId: 'income' }, // Gross
                { amount: -40000, categoryId: 'fed-tax' }, // Federal tax
                { amount: -20000, categoryId: 'state-tax' }, // State tax
                { amount: -20000, categoryId: 'insurance' }, // Insurance
            ],
        });

        expect(result.success).toBe(true);
    });
});
```

---

## 10. Integration Points

### 10.1 Adapter Interfaces (Hexagonal Ports)

```typescript
// src/core/ports/StoragePort.ts
interface IStoragePort {
    load(): Promise<ILedgerState>;
    save(state: ILedgerState): Promise<void>;
    exportBackup(): Promise<Blob>;
}

// src/core/ports/EncryptionPort.ts
interface IEncryptionPort {
    encrypt(plaintext: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer>;
    decrypt(ciphertext: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer>;
    deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>;
}
```

### 10.2 Zustand Store Integration

```typescript
// src/app/store/ledgerStore.ts (UI Layer - NOT in /core)
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ITransactionEngine } from '@/core/engine/TransactionEngine';

interface ILedgerStore {
    transactions: Array<ITransaction>;
    engine: ITransactionEngine;

    // Actions delegate to engine, update state via Immer
    addTransaction: (input: ICreateTransactionInput) => Result<ITransaction>;
}
```

---

## Appendix A: Error Codes Reference

| Code                    | HTTP Equiv | Description                           |
| ----------------------- | ---------- | ------------------------------------- |
| `SPLIT_SUM_MISMATCH`    | 422        | Splits don't sum to transaction total |
| `TRANSACTION_NOT_FOUND` | 404        | Transaction ID doesn't exist          |
| `INVALID_AMOUNT`        | 400        | Non-integer or overflow amount        |
| `DUPLICATE_IMPORT`      | 409        | Import hash already exists            |
| `RECONCILED_IMMUTABLE`  | 403        | Cannot modify reconciled transaction  |
| `INVALID_DATE_FORMAT`   | 400        | Unparseable date string               |
| `ACCOUNT_NOT_FOUND`     | 404        | Account ID doesn't exist              |

---

## Appendix B: Glossary

| Term            | Definition                                                 |
| --------------- | ---------------------------------------------------------- |
| **Cents**       | Integer representation of USD currency (100 cents = $1.00) |
| **Split**       | A sub-allocation of a transaction to a category            |
| **Cleared**     | Transaction confirmed in bank statement                    |
| **Reconciled**  | User-verified and locked from modification                 |
| **Import Hash** | SHA-256 hash for duplicate detection                       |
| **Projection**  | Forward-looking balance calculation                        |
