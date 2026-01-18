# Technical Specifications: Business Logic

## 1. Split-Transaction Engine (TransactionEngine.ts)

The engine manages the core lifecycle of financial data with "Penny-Perfect" accuracy.

### Math Strategy

- **Integer Cents**: All monetary values are handled as `number` types representing cents (e.g., $1.99 = 199).
- **Rounding**: Rounding only occurs at the point of QIF/CSV parsing or UI display using `Math.round()` to prevent cumulative floating-point errors.
- **Invariant**: Every transaction must satisfy `Sum(splits.amount) === totalAmount`. The engine must block any commit that violates this rule.

### State Transitions

- **Pending**: Initial state of imported data.
- **Cleared**: Intermediate state after user acknowledgement.
- **Reconciled**: Final, immutable state matched against an external statement. Locked to prevent historical ledger changes.

## 2. Defensive QIF Parser (QIFParser.ts)

Handles the non-standardized and legacy nature of QIF files.

### Normalization Logic

- **Date Parsing**: Supports multi-pattern regex matching (M/D'YY, ISO, etc.). Defaults to a sliding window for 2-digit years (00-49 maps to 2000s).
- **Amount Cleaning**: Strips currency symbols, commas, and whitespace before integer conversion.
- **Deduplication Hashing**: Generates a deterministic SHA-256 hash using `Date + AbsoluteAmount + NormalizedPayee`.

## 3. 90-Day Projection Engine

Generates a future-looking balance forecast.

- **Algorithm**: `Projection(today, horizon)`
    1. Initialize `rollingBalance = currentClearedBalance`.
    2. Iterate `day` from `today + 1` to `today + 90`.
    3. For each `day`:
        - Evaluate `activeSchedules`: Match `startDate`, `frequency`, and `endDate`.
        - Sum all matched `schedule.amount`.
        - Add any `pendingTransactions` with a `dueDate` matching `day`.
        - Update `rollingBalance += dailyDelta`.
        - Push `{ date: day, balance: rollingBalance, items: [...] }` to the series.

## 4. Local-First Storage & Provider Pattern

Ensures user OWNERSHIP of data (BYOS - Bring Your Own Storage).

### Architecture

- **DB**: SQLite (via SQL.js) running in the browser/app thread.
- **Sync**: A `StorageProvider` interface abstracts the persistence layer.
    - `GoogleDriveProvider`: Uses `appDataFolder` for private, sandboxed sync.
    - `ICloudProvider`: Uses `CloudKit JS` (web) and `CloudKit` (native).
- **Encryption**: AES-GCM 256-bit. Data is encrypted locally before being transmitted to the storage provider. The key is derived from the user's SSO ID via PBKDF2.

## 5. Security & Privacy

- **Client-Side Only**: The application never transmits raw financial data to Path Logic servers.
- **Master Key**: Derived locally on every session using the Web Crypto API. Non-recoverable by Path Logic.
