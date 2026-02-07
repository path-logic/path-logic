# Path Logic MVP - Functional Feature Specifications

## 1. Account Management

### 1.1 Account Types

The system must support the following account types:

- **Checking**: Standard transactional account.
- **Savings**: Interest-bearing account.
- **Cash**: physical currency tracking.
- **Auto**: Vehicle loan tracking.
- **Credit Card**: Credit line tracking.
- **Mortgage**: Real estate loan tracking.
- **Personal Loan**: Unsecured or other loan tracking.

### 1.2 Account Operations

- Create, edit, and delete accounts.
- View account balance and transaction history.
- Distinguish between "Cleared" and "Projected" balances.

## 2. Transaction Management & Splits

### 2.1 Split Transactions

- Support complex transactions where one total amount is divided into multiple categories (splits).
- **Granular Paycheck Splits**: Users must be able to enter every line item from their paystub:
    - Gross Pay (Income)
    - Federal Tax (Expense/Tax)
    - State Tax (Expense/Tax)
    - Social Security / Medicare (Expense/Tax)
    - Health Insurance (Expense/Insurance)
    - Vision/Dental Insurance (Expense/Insurance)
    - 401(k) / HSA Contributions (Transfer/Investment)
- **Granular Mortgage Splits**: Users must be able to enter line items from their mortgage statement:
    - Principal (Transfer/Liability)
    - Interest (Expense/Interest)
    - Escrow/Property Tax (Expense/Tax)
    - Private Mortgage Insurance (PMI) (Expense/Insurance)
- **Rent/Utility Splits**: Ability to split a single payment into rent, water, electric, or shared expenses.
- **Invariant**: The sum of all splits must equal the transaction total.
- **Negative Splits**: Allow negative split amounts (e.g., tax deductions in a paycheck).
- **Goal**: This granularity enables advanced charting, tax estimation, and forward-looking cashflow forecasting.

## 3. QIF Data Operations

### 3.1 QIF Import (Account Level)

- Import transactions from a QIF file into a specific account.
- Handle deduplication (Date + Amount + Payee hash).

### 3.2 QIF Import (System Level / Migration)

- Import an entire data system from QIF.
- **Merge System**: Implement logic to handle overlapping data.
    - Match existing transactions to imported ones.
    - Provide options to overwrite, skip, or create separate entities.

### 3.3 QIF Reconciliation Import

- Import QIF for reconciliation purposes.
- Existing transactions are merged with QIF data.
- New QIF transactions are flagged as "potentially new" for user review.

### 3.4 QIF Export

- Export the entire system (all accounts, categories, and transactions) into a single QIF file.
- Purpose: Common backup and data portability.

## 4. Storage & Sync Architecture

### 4.1 Multi-Adapter Storage

- **Primary Storage**: Google Drive (appdata folder).
- **Secondary Storage**: IndexedDB (local browser storage).

### 4.2 Sync Logic

- When authenticated with Google, data is saved to both GDrive and IndexedDB.
- **Offline/Expired Session**: If the GDrive session is unavailable, the system continues to work using IndexedDB.
- **Resync**: When the GDrive session is renewed, the system must detect deltas and resync with GDrive (bidirectional or GDrive-as-truth with local merge).

## 5. Authentication & Trust

### 5.1 Google SSO

- Use Google SSO for user authentication.
- Scope: `https://www.googleapis.com/auth/drive.appdata` for storage.

### 5.2 Gaining Trust

- Documentation and UI transparency on how GDrive appdata is used.
- "Your data stays in your Drive" messaging.
