# Path Logic MVP - Technical Specifications

## 1. Storage & Sync Architecture

### 1.1 Multi-Adapter System

The application uses a `PersistenceManager` that orchestrates multiple adapters.

- **GDriveAdapter**: Interacts with Google Drive API (`appDataFolder`).
- **IndexedDBAdapter**: Interacts with local browser storage via Dexie.js or native IndexedDB.

### 1.2 Sync Algorithm (IndexedDB + GDrive)

- **Local-First**: All writes are first committed to IndexedDB.
- **Background Sync**: A sync process attempts to push changes to GDrive.
- **Conflict Resolution**:
    - Each record has a `lastModified` timestamp and a `version`.
    - GDrive is treated as the "Shared Truth".
    - If a local change is older than the GDrive version, a merge or overwrite is triggered based on user preference or automatic heuristics.
- **Offline Buffer**: Pending changes for GDrive are stored in a `SyncQueue` in IndexedDB.

## 2. OSS Strategy (@path-logic/core)

### 2.1 Package Scope

The `@path-logic/core` package contains framework-agnostic business logic:

- `TransactionEngine`: Validation, calculations, split logic.
- `QIFParser`: Defensive parsing logic.
- `ProjectionEngine`: 90-day cashflow algorithm.
- `Types`: Shared interfaces (ITransaction, IAccount, ISplit).

### 2.2 Packaging & Distribution

- **Build Tool**: TSDX or custom Rollup config for dual ESM/CJS support.
- **Documentation**: TSDoc comments for API extraction (TypeDoc).
- **Registry**: GitHub Packages or NPM Public Registry.

## 3. Deployment Pipeline

### 3.1 Web App (Vercel)

- Trigger: Push to `main` branch.
- Tool: Vercel GitHub Integration or GHA with Vercel CLI.
- Environment: Next.js 15, React 19.

### 3.2 NPM Publishing

- Trigger: New Tag/Release on GitHub.
- Tool: GitHub Actions.
- Steps: Lint, Test, Build, `npm publish`.

## 4. Google SSO & GDrive Security

### 4.1 Implementation

- **Library**: `@react-oauth/google` or NextAuth.js with custom GDrive scopes.
- **Token Management**: Refresh tokens must be handled securely (Secure HttpOnly cookies if SSR, or encrypted local storage if client-side).
- **Data Protection**: AES-GCM 256-bit encryption for data stored in GDrive, using a key derived from the user's secret/passphrase.
