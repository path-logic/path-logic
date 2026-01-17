# Path Logic - Technical Deep Dive

This document provides a detailed breakdown of the architectural choices for Path Logic, addressing the "BYOS" (Bring Your Own Storage) model, the PWA implementation, and the local-first strategy.

## 1. Task Orchestration with Nx

### Running Nx Locally
Nx is the engine behind all workspace commands. You generally interact with it through the root `package.json` to leverage caching:

- `npm run lint`: Checks all projects (cached).
- `npm run test`: Runs Vitest for the core library.
- `npx nx graph`: Opens a visual map of the monorepo dependencies.

### Nx Cloud
**Is it worth it?** For this project, **Yes**. 
- **Remote Caching**: Even if you are the only developer, Nx Cloud caches your builds and tests. If you switch machines or run CI, it pulls from the cloud instead of re-running.
- **GitHub Integration**: It gives you a beautiful dashboard for PRs to see exactly why a build failed.

---

## 2. Infrastructure & Deployment

### Deployment on Vercel
We are using **Vercel** because it is the native home for Next.js 15.
- **Docker?** No. Vercel handles the build environment and edge deployment automatically. Docker would only be needed if we were hosting a custom server on AWS/GCP.
- **Client vs. Server**: Path Logic is a **Hybrid App**.
  - **Server-Side (Next.js)**: Handles the initial page load, routing, and serving the static assets.
  - **Client-Side (The Engine)**: The actual financial logic (`@path-logic/core`) and the SQLite (WASM) database run inside the user's browser.

### SSR vs. CSR: The Critical Decision

**Question**: Should this app use Server-Side Rendering?

**Answer**: **Hybrid Strategy** (SSR for shell, CSR for data).

| Component Type | Rendering | Why |
| :--- | :--- | :--- |
| Layout/Shell | **SSR** (Server Components) | Fast First Contentful Paint, SEO |
| Dashboard/Ledger | **CSR** (`'use client'`) | Needs access to browser SQLite |
| Static Pages (About, Pricing) | **SSR** or Static | Performance |

**Implementation Pattern**:
```tsx
// ✅ Server Component (Default in App Router)
export default function RootLayout({ children }) {
  return <html lang="en">...</html>;
}

// ✅ Client Component (Accesses SQLite)
'use client';
export default function Dashboard() {
  const db = useSQLite(); // Browser-only
  return <Ledger data={db.getTransactions()} />;
}
```

**Key Insight**: Next.js 15 App Router was designed for this exact pattern. We get the best of both worlds:
- **Fast initial load** (SSR shell)
- **Private data access** (CSR for all ledger/transaction views)


### Comparison: Is Vercel the "Best" Choice?

| Feature | Vercel (Current) | Cloudflare Pages | Self-Hosted (Docker/VPS) |
| :--- | :--- | :--- | :--- |
| **Cost** | Free (Hobby) / $20/mo (Pro) | **Industry leading (Free tier is massive)** | Fixed ($5-$10/mo) |
| **Speed** | Excellent (Global Edge) | **Superior (Fastest global CDN)** | Depends on region |
| **Uptime** | 99.9% | 99.9% | You manage it |
| **Ease of Use** | **Best in class** | Excellent | Manual overhead |

**Verdict**: 
- **Start with Vercel**: The integration with Next.js is seamless. For an MVP, the speed of development and deployment is worth more than a few dollars saved.
- **Scale with Cloudflare**: If the app grows and you hit Vercel's bandwidth limits, migrating to Cloudflare Pages is trivial since our app is mostly static/client-side.

### The "No-Backend" Backend (BYOS)
By embedding the data store within the user's Google Drive or iCloud:
- **Zero DBMS**: We do **not** need a central database (PostgreSQL/MongoDB). The storage cost and security liability are transferred to the user's own cloud.
- **Security**: Since we never see the data, we can't lose it.
- **Privacy**: This is our primary differentiator.

#### Dual-Provider Support (Web PWA)

The web application must support **both** authentication and storage providers:

| Provider | SSO | Storage Backend | Web API Availability |
| :--- | :--- | :--- | :--- |
| **Google** | Google Sign-In | Google Drive API | ✅ Excellent |
| **Apple** | Sign in with Apple | iCloud Drive API | ⚠️ Limited (CloudKit JS) |

**Implementation Pattern**:
```typescript
interface IStorageProvider {
  authenticate(): Promise<IUser>;
  saveEncryptedDB(data: ArrayBuffer): Promise<void>;
  loadEncryptedDB(): Promise<ArrayBuffer>;
}

class GoogleDriveProvider implements IStorageProvider { ... }
class ICloudProvider implements IStorageProvider { ... }
```

#### CloudKit JS Limitations (Web PWA for Apple Users)

CloudKit JS is functional but has constraints compared to native CloudKit:

| Feature | Native CloudKit (iOS) | CloudKit JS (Web) |
| :--- | :--- | :--- |
| **Background Sync** | ✅ Automatic | ❌ Manual (user must be in app) |
| **Conflict Resolution** | ✅ Advanced (CKRecord changeTag) | ⚠️ Basic (last-write-wins) |
| **Subscriptions/Push** | ✅ Real-time notifications | ❌ Not supported |
| **Record Zones** | ✅ Full support | ⚠️ Limited (no custom zones) |
| **Offline Queue** | ✅ Native queue | ⚠️ Manual implementation |

**Critical Limitation**: **No background sync**. The web app must be open and active to sync changes to iCloud.

**Impact on Your Use Case**:
Given your **constrained mobile UX** (mostly viewing, limited CRUD):
- ✅ **Reading data**: Works perfectly. User opens web app, it pulls latest from iCloud.
- ✅ **Adding a transaction**: Works. Save locally, sync when user is in the app.
- ⚠️ **Multi-device editing**: If a user edits on mobile then immediately opens web, there's a ~5-10 second window where web might show stale data until CloudKit JS polls for changes.

**Recommendation**: For Apple users who primarily _view_ data on web and _edit_ on iOS, CloudKit JS is **fine**. For power users who need instant cross-device sync, recommend the native iOS app.

---

## 3. PWA & Local-First Storage

### Purpose of the PWA
The PWA implementation is not just for marketing; it's a technical requirement for a "Penny-Perfect" experience:
1. **Offline Capability**: You should be able to check your balance or add a transaction on a plane. The Service Worker ensures the app loads without internet.
2. **Persistent Storage**: Local-first means we use **SQLite (WASM)** in the browser. The PWA helps manage the lifecycle of this persistent state.
3. **App Feel**: On mobile/desktop, it allows the user to "install" the app, giving it a dedicated window and better OS integration.

---

## 4. CI/CD with GitHub Actions (GHA)
We use GHA (`code-quality.yml`) to ensure every push to `main` remains "Green".
- **Linting**: Enforces our naming conventions and strict typing.
- **Testing**: Ensures the `TransactionEngine` never breaks its penny-perfect invariants.
- **Nx Affected**: In the future, we will use `nx affected` to only test what changed, keeping the CI extremely fast.

---

## 5. Multi-Platform Strategy (React Native)

The `@path-logic/core` library is **framework-agnostic**. This enables a true "Write Once, Deploy Everywhere" approach.

### Platform Architecture

```
┌──────────────────────────────────────────────┐
│       @path-logic/core (TypeScript)          │
│   ✓ TransactionEngine   ✓ QIFParser          │
│   ✓ CashflowProjection  ✓ Money Utils        │
└──────────────────────────────────────────────┘
              ▲           ▲           ▲
              │           │           │
    ┌─────────┴────┐  ┌───┴─────┐  ┌─┴──────────┐
    │   Web PWA    │  │   iOS   │  │  Android   │
    │  (Next.js)   │  │   (RN)  │  │    (RN)    │
    └──────────────┘  └─────────┘  └────────────┘
```

### What Transfers Directly to React Native:
- ✅ All business logic (`TransactionEngine`, `CashflowProjection`)
- ✅ All domain types and interfaces
- ✅ All math and validation utilities
- ✅ QIF/CSV parsing logic

### Platform-Specific Adapters Needed:

| Concern | Web (PWA) | React Native |
| :--- | :--- | :--- |
| **SQLite** | `sql.js` (WASM) | `expo-sqlite` (native) |
| **Storage** | Google Drive Web API / CloudKit JS (limited) | **CloudKit (iOS)** / Drive Native API (Android) |
| **UI** | React + Next.js | React Native components |
| **Crypto** | Web Crypto API | `react-native-quick-crypto` |

**Why Native Apps Matter for iCloud Users**: CloudKit JS (web) has sync limitations compared to native CloudKit. Users who choose Apple ID + iCloud will have a significantly better experience on the native iOS/iPadOS app.

### Implementation Path:
1. **Phase 1 (Current)**: Prove the core engine and UX with the Web PWA.
2. **Phase 2**: Create `apps/mobile` with React Native, importing the exact same `@path-logic/core`.
3. **Phase 3**: Implement platform-specific adapters (storage, SQLite) using the Adapter Pattern.

**Key Advantage**: If you fix a split-validation bug in the core engine, it's fixed across all platforms instantly. This is the power of the Open Core model.

