# Functional Specification: Sync & Reconciliation System

## 1. Overview

The Sync & Reconciliation System is a high-density, logical data management layer designed to maintain a "Penny-Perfect" ledger across multiple devices while allowing the user to reconcile their manual entries against official bank data (QIF).

The system ensures that multi-device conflicts and bank data discrepancies are resolved with line-by-line granularity, ensuring the user remains the ultimate authority over their financial data.

## 2. Key Features

### 2.1 Multi-Device Logical Sync

- **Logical Diffing**: Instead of swapping raw database files, the system identifies specific rows added or modified on each device.
- **Automatic Merging**: Changes that do not overlap (e.g., adding different transactions) are merged automatically without user intervention.
- **Conflict Detection**: Overlapping changes (e.g., the same transaction edited on two devices) are flagged for manual resolution.

### 2.2 Bank Reconciliation (QIF/CSV)

- **Matching Engine**: Automatically matches imported bank transactions to existing manual entries using a combination of transaction hashes, identical amounts, and fuzzy date windows.
- **Match Verification**: The UI presents "Suggested Matches" for user confirmation.
- **Unmatched Entry Handling**: The UI presents "Unmatched Entries" for user confirmation as new, or in need of manual matching/override.
- **Match Verification Override**: The UI allows the user to override the suggested match and select a different match.
- **Duplicate Prevention**: Deterministic hashing prevents the same bank entry from being imported twice.

### 2.3 Comprehensive Conflict Resolution UI

- **High-Density Comparison**: A side-by-side view (inspired by classic financial software) showing "Your Entry" vs "Remote/Bank Entry."
- **Line-by-Line Resolution**: Users can choose specific fields from either source (e.g., keeping their own Memo but accepting the Bank's Date).
- **Bulk Actions**: "Accept All Matches" and "Keep All Local Changes" to speed up common workflows.

### 2.4 Cloud Integrity (Shared Locking)

- **Merging Flag**: When a device starts a merge/sync operation, a global "Merging" flag is set on GDrive.
- **Read-Only Safety**: Other devices are prevented from pushing updates while a merge is in progress to prevent graft or data corruption.
- **Manual Override**: Power users can forcibly release a stale lock (e.g., if a device crashed mid-sync).

## 3. User Experience & UI Design

### 3.1 Reconciliation Interface

The UI utilizes a high-density table structure:

- **Alert Column**: Visual indicators (!) for records requiring attention.
- **Grouped Rows**: The local entry and its suggested match are grouped together for immediate visual comparison.
- **Match Override Buttons**: "Accept Match" (augment local entry with bank data), "Override Match" (override Matching Engine selection with separate, existing entry. Provides a UI for selecting a different transaction to match).

### 3.2 Sync Status Information

- **Global Indicator**: A status bar pulser showing "Syncing," "Conflict Detected," or "Merging (Remote Locked)."
- **Lock Info Overlay**: An info panel showing exactly which device holds the current sync lock and for how long.

## 4. User Stories

- **Dual Edit**: "As a user, I edit a transaction, account, or other data field on my laptop while offline. Later, I edit the same entry or data field on my phone. When my laptop comes online, I should be able to pick which edit is correct field-by-field or by the entire entry."
- **Payday Reconciliation**: "As a user, I manually enter my paycheck. I then download a QIF from my bank. The system should match my manual entry to the bank entry, allowing me to 'Clear' the transaction with one click."
- **Entry Reconciliation**: "As a user, I manually enter transactions. I then download a QIF from my bank. The system should match my manual entries to the bank entries, allowing me to 'Clear' the transactions with one click."
- **Manual Override**: "As a user, I want to override a suggested match when the automatic engine incorrectly matches a bank transaction to a different manual entry that I know is unrelated."
- **Unmatched Record Classification**: "As a user, I see a list of bank entries that don't match any manual records. I want to quickly classify them as new transactions or manually search for an existing transaction that might have a vastly different date/amount."
- **Stale Lock Recovery**: "As a user, if my phone dies during a sync, I want to be able to manually clear the 'Merging' flag from my laptop so I can continue working."
