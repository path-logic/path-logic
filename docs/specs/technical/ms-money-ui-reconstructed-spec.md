# Microsoft Money Native UI Reconstructed Specification (REA Extraction)

## 1. Overview & Provenance

This specification documents the complete UI dialog architecture, workflows, control identifiers, and native screen layouts of Microsoft Money Plus (`17.0.0.3817`), extracted directly from `obres.dll` (7.5 MB, 1,170 PE resources, 619 dialog templates) located at `/mnt/c/Program Files (x86)/Microsoft Money Plus/MNYCoreFiles/obres.dll` via Reverse Engineer Anything (`rea`).

This document serves as the canonical reference for UI terminology, control layouts, and user interactions when migrating features from Microsoft Money into Path Logic.

---

## 2. Authentication & Master Password UI

Microsoft Money files use two primary security models, reflected in dialogs `12522`, `12548`, `12555`, and `12541`:

### 2.1 File Password Settings (Dialog `12522`) & Windows Live ID (Dialog `12548`)

- **Dual Authentication Tracks**:
    1. **Offline Money Password (`OFL\`)**: Traditional 40-byte UTF-16LE password hashed with SHA-1/MD5 to verify the check value at `0x2e9 + varOffset`.
    2. **Windows Live ID (`ONL\`)**: Online Passport identity with Username (e-mail address) and Password, stored in the 40-byte `ONL\` key slot at `0x299 + varOffset`.
- **Controls**:
    - `[Edit]` Username / Email (Live ID)
    - `[Edit]` Old password / Current password
    - `[Edit]` New password / Confirm new password
    - `[Checkbox]` "Remember my password" (`id: 1427`)
    - `[Checkbox]` "Offer to let me change the file that uses features that require Windows Live ID" (`id: 1000`)
- **Path Logic Implementation**: The Migration Wizard supports both modes: entering an offline password or a Windows Live ID username + password to unwrap the corresponding key slot.

---

## 3. Account Management & Loan UI

### 3.1 New / Change Account Workflows (Dialogs `130..163`, `12208`, `12507`)

- **Account Types**:
    - `Bank / Checking` (`at = 0`): Account number, routing number, minimum balance, overdraft protection.
    - `Credit Card` (`at = 1`): Credit limit, APR, payment due date.
    - `Line of Credit / Loan` (`at = 6`): APR, loan term, payment schedule, linked escrow account.
    - `Investment` (`at = 5`): Linked cash account (`hacctRel`), dividend handling.
- **Account Settings (Dialog `3154`)**:
    - Account Nickname (`szAls`), Official Name (`szFull`), Account Number (MSOFD encrypted `mNum`), Currency selector, "Closed Account" toggle (`fClosed`), "Favorite Account" toggle (`fFavorite`).

### 3.2 Loan Payment & Interest Adjustments (Dialogs `12092`, `12095`, `12289`)

- **Difference Resolution Workflow (Dialog `12092`)**:
    - Displays: Total Loan Payment, Sum of Splits (Principal + Interest + Escrow), and Difference.
    - Interactive Resolution Radio Buttons:
        1. `"Apply all of the unassigned amount to principal."` (`id: 16236`)
        2. `"Manually change the split amounts in the split dialog box."` (`id: 16238`)
        3. `"Change the loan payment amount to be the sum of the loan split amounts."` (`id: 16239`)
        4. `"Leave the amount unassigned (not recommended)."` (`id: 16241`)

---

## 4. Payee Directory & Address Book UI

### 4.1 Edit Address & Payee Details (Dialog `24577`)

- **Direct Columns from `ADDR` & `PAY`**:
    - `[Edit]` Name / Payee Name (`PAY.szFull`)
    - `[Edit]` Address Lines 1, 2, 3 (`ADDR.mAddr1..3`)
    - `[Edit]` City (`ADDR.mCity`)
    - `[ComboBox]` State / Province (`ADDR.mState`)
    - `[Edit]` ZIP / Postal Code (`ADDR.mPostalCode`)
    - `[Edit]` Phone Number (`ADDR.mPhoneHome` / `mPhoneWork`)
    - `[Edit]` Account Number at Payee (`PAY.mAcctNum`, MSOFD salt `0x28`)

### 4.2 Payee Name Variations & Alias Merging (Dialog `16339`, `16340`, `16341`)

- **Native Prompt**: _"Enter the payee name variation to be automatically changed to your preferred payee name."_
- **Controls**:
    - `[ComboBox]` Preferred Payee Name (`PAY.hpay`)
    - `[Edit]` Payee Name Variation (`XPAY` / `hpayParent` alias)
- **Path Logic Implementation**: The Migration Wizard allows users to collapse child payee aliases into the parent payee with a single click during migration.

---

## 5. Ledger, Split Transactions & Reconciliation UI

### 5.1 Split Transaction Discrepancy Handling (Dialog `12081`)

- **Prompt**: When split sum does not match transaction amount:
    1. `"Return to the Split Transaction dialog box to edit the splits."`
    2. `"Set the total transaction amount to <Sum>."`
    3. `"Distribute <Difference> proportionally between the split amounts. This is a good way to assign sales tax."`
    4. `"Leave <Difference> unassigned (not recommended)."`

### 5.2 Deposit With Cash Back (Dialog `27001`)

- **Split Invariant Preservation**:
    - Total Deposit (gross amount before cash back)
    - Category selector for deposit
    - Cash Back amount (negative split deduction)
    - Net Total Amount deposited to account: $\text{Net Total} = \text{Deposit Amount} - \text{Cash Back}$

### 5.3 Account Balance Reconciliation (Dialogs `12032`, `12033..12035`, `12218`)

- **Reconciliation Workflow**:
    - Opening Cleared Balance + Marked Deposits - Marked Payments = Ending Statement Balance.
    - Difference display with 1-click "AutoBalance" adjustment transaction generation.

---

## 6. Recurring Transactions & Cash Flow UI

### 6.1 Recurring Bill & Paycheck Editor (Dialogs `24013..24015`, `12374`)

- **Schedule Controls**:
    - Frequency: Monthly, Bi-Weekly, Semi-Monthly, Weekly, Annual.
    - Next Due Date (`BILL.dt`), End Date (`BILL.dtMax`).
    - Auto-Enter in Register (`BILL.cDaysAutoEnter` days in advance).
    - Split Paycheck Template: Gross pay (Income) with split deductions for Federal Tax, State Tax, FICA, 401(k), and Medical Insurance.

---

## 7. Multi-Currency, Investments & Custom Tools

### 7.1 Multi-Currency Management (Dialogs `12103`, `12109`, `12378`, `12508`, `12514`)

- Currency Name, ISO 4217 Symbol (`szIsoCode`), Exchange Rate (`rate`), Base Currency anchor (`DHD.hcrncCur`).

### 7.2 Investment Trade Dialogs (Dialogs `12154`, `12183`, `12397`, `12536`, `25615`)

- Buy / Sell / Dividend / Reinvest / Stock Split / Return of Capital.
- Tax Lot Allocation (`Dialog 12397` - First In First Out, Last In First Out, Specific Identification).
- Stock Option Exercise (`Dialog 12536..12539` - ISO / NQSO exercise, cashless exercise).
