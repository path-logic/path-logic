# Technical Specification: Sync & Reconciliation Engine

## 1. Architecture Overview

The engine operates as a **3-way Logical Merge** layer. It compares the current **Local State** and the latest **Remote State** against a shared **Base State** (the state at the time of the last successful sync).

## 2. Data Model Enhancements

### 2.1 Schema Updates

Every mutable entity (Transactions, Accounts, Payees, Categories, Schedules) must support the following columns:

- **`updatedAt` (TEXT)**: ISO 8601 timestamp in UTC. High precision required for tie-breaking.
- **`clientId` (TEXT)**: A persistent UUIDv4 generated per browser instance.
- **`isDeleted` (INTEGER)**: Boolean flag for soft-deletes (permits logical merging of deletions).

### 2.2 Sync Metadata Table

A new internal table `sync_metadata` will persist local sync state:

- `lastSyncHash`: Hash of the remote SQLite file at last sync.
- `lastSyncTime`: UTC timestamp of last sync.
- `deviceUuid`: The current `clientId`.

## 3. Distributed Locking (GDrive)

### 3.1 Lock File Specification

- **Path**: `appDataFolder/sync-lock.json`
- **Schema**:
    ```json
    {
        "clientId": "uuid-of-holder",
        "deviceName": "Chrome on Linux",
        "issuedAt": "iso-timestamp",
        "expiresAt": "iso-timestamp",
        "status": "merging"
    }
    ```
- **TTL**: Locks expire automatically after 5 minutes of inactivity.

### 3.2 Acquisition Algorithm

1. Check for `sync-lock.json`.
2. If exists and `now < expiresAt` and `clientId != self`:
    - Fail with `LockAcquisitionError`.
3. If not exists or expired:
    - Upload new lock with `self.clientId`.
    - Wait 500ms and re-download to verify `self` is the holder (concurrency check).

## 4. The Logical Merge Algorithm

### 4.1 SQLite -> SQLite (Sync)

1. **Identify Changes**: Use `updatedAt > lastSyncTime` to find local and remote change sets.
2. **Classify Conflicts**:
    - **Soft Conflict**: Different entities modified (Auto-merge).
    - **Hard Conflict**: Same Entity ID modified on both sides.
3. **Resolution Strategy**:
    - **Entire Entry**: User can select to keep the entire local or remote record.
    - **Field-by-Field**: Perform field-by-field comparison. If `local.field != remote.field`, mark for granular UI selection.

### 4.2 QIF -> SQLite (Reconciliation)

1. **Deduplication**: Use `importHash` (generated from Date + Amount + Payee) to skip known bank records.
2. **Scoring Engine**:
    - Weight 100: Exact `importHash` match.
    - Weight 80: Exact `amount` + `date` within +/- 1 day + `payee` similarity > 0.8.
    - Weight 50: `amount` match + `date` within +/- 3 days.
3. **Suggested Matches**: Matches with Weight >= 50 are presented for verification.
4. **Manual Override & Match Selection**:
    - If a Suggested Match is rejected, the user can manually search/select an existing `ITransaction`.
    - Reconciliation logic updates the manual entry's `status` to `Cleared` and merges Bank metadata (e.g., precise Date/Payee).
5. **Unmatched Handling**: Matches with Weight < 50 are classified as "Unmatched."
    - User can confirm as "New Transaction" (creates a new entry).
    - User can manually map to an existing transaction (manual link).

## 5. Security Performance

- **Client-Side Only**: All merging logic happens in WASM/JS. Decrypted data never touches GDrive.
- **Batching**: Database updates are executed within a single SQLite transaction to ensure ACID compliance during the merge.
- **Lock Cleanup**: `forceReleaseLock()` simply deletes the `sync-lock.json` via GDrive API.

## 6. Implementation Notes

- **Fuzzy Matching**: Uses Levenshtein distance for payee name comparison.
- **Tie-Breaking**: In the event of clock skew, the UI will always default to prompting the user for hard conflicts.
