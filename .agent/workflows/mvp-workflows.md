---
description: Workflows for implementing Path Logic MVP features.
---

# MVP Implementation Workflows (/mvp)

## 1. Implement Account Type

1. Create/Update the `AccountType` enum in `@path-logic/core`.
2. Update the `AccountSchema` for validation.
3. Update the `AccountCreationForm` in the web app to support the new type.
4. Add unit tests for the new account type logic in `AccountEngine.test.ts`.

## 2. Implement QIF Import Flow

1. implement parsed QIF data mapping to `ITransaction` in `@path-logic/core`.
2. Develop the `De-duplication` logic based on Date + Amount + Payee.
3. Create the `ImportWizard` component in the web app.
4. Implement the `Reconciliation` preview UI to show potential matches and new transactions.

## 3. Implement GDrive Sync

1. implement the `GDriveAdapter` using the Google Drive API.
2. implement the `PersistenceManager` sync orchestrator.
3. monitor `IndexedDB` changes and trigger background sync.
4. handle authentication expiry by reverting to local-only mode and showing a re-auth prompt.

## 4. Package & Publish @path-logic/core

1. ensure all business logic is in `packages/core`.
2. run `npm run build` in `packages/core`.
3. document all public APIs using TSDoc.
4. update `package.json` version and run `npm publish` (via GHA).
