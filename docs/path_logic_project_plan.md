# Path Logic: Project Plan

## **1. Project Identity & Architecture (The System Rules)**

**Goal:** Establish the technical "Constitution" for all AI agents.

### **1.1 Technical Guardrails**

- **Framework:** Next.js 15 (App Router), TypeScript (Strict), Tailwind CSS.
- **State Management:** Zustand with Immer middleware for immutable ledger updates.
- **Persistence:** Local-first SQLite (via SQL.js/WASM).
- **Security:** AES-GCM 256-bit client-side encryption via Web Crypto API.
- **Storage Strategy:** User-Owned Data (BYOS). The app interacts with Google Drive (appDataFolder) or iCloud (CloudKit) via a Provider Pattern.
    - **Web PWA**: Google Drive Web API (excellent) + CloudKit JS (limited - no background sync)
    - **React Native**: Native CloudKit (iOS) + Google Drive Native API (Android)
- **Documentation Convention:** All project documentation (Specs, Plans, Architecture) MUST be stored in the ./docs directory. With subdirectories based upon doc type.

### **1.2 TypeScript Strict Typing Requirements**

**CRITICAL: All TypeScript code MUST use explicit typing. This is non-negotiable.**

- **All variable declarations** must have explicit types
- **All function parameters** must have explicit types
- **All function return types** must be explicit
- **All destructured variables** must have explicit types
- **Use `Array<T>` syntax** instead of `T[]`
- **Async functions** must have explicit `Promise<T>` return types
- **React hooks** must have explicit types for their results
- **Error handling** must type the error as `unknown`

See `docs/architecture/typescript-standards.md` for complete guidelines.

### **1.3 Accessibility Mandate**

**CRITICAL: All User Interface components MUST meet WCAG 2.2 AA standards.**

- **Color Contrast:** Text and interactive elements must have a contrast ratio of at least 4.5:1 against the background (3:1 for large text).
- **Keyboard Navigation:** All interactive elements must be reachable and actionable via keyboard.
- **Screen Reader Support:** Use semantic HTML and ARIA labels where necessary.
- **Focus Indicators:** Visible focus states are mandatory for all interactive elements.

See `docs/architecture/accessibility-standards.md` for complete guidelines.

## **2. Functional & Technical Specifications**

### **2.1 The "Penny-Perfect" Core Engine**

The engine must handle the "Split-Transaction Reconciliation" problem where a single bank activity (e.g., a $2,000 paycheck deposit) consists of multiple sub-ledger entries (Gross Pay, Taxes, Insurance).

- **Technical Logic:** \- A Transaction is a parent entity with a TotalAmount.
    - It contains an array of Splits.
    - **The Invariant:** Sum(Splits) \=== TotalAmount.
    - **The Math:** Use integer-based math (cents) or Big.js to avoid floating-point errors.
    - **Negative Deductions:** The engine must allow negative split amounts within a positive transaction total (e.g., \-$500 Tax in a \+$2000 Paycheck).

### **2.2 QIF/CSV Polished Parser**

QIF is a legacy, non-standardized format. The parser must be defensive.

- **Technical Specs:**
    - Handle 2-digit vs 4-digit years.
    - Support "Type:Bank", "Type:CCard", and "Type:Cash".
    - **Deduplication:** Generate a deterministic hash for every transaction based on Date \+ Amount \+ Payee to prevent duplicate imports.

### **2.3 The 90-Day Cashflow Projection Engine**

This is the "Forward-Looking" differentiator.

- **Algorithm:** \- Input: CurrentClearedBalance \+ UnscheduledTransactions \+ RecurringSchedules.
    - Logic: A daily iterator from Today to Today \+ 90\.
    - For each day, sum all "Due" recurring items and "Pending" ledger items.
    - Output: A time-series array: \[{date: string, projectedBalance: number, delta: number}\].

### **2.4 Accounts & Payee Domain (CRUD)**

Expanding the system to support full transaction lifecycle management and deep payee tracking.

- **Payee "Drill-Down"**:
    - Every transaction MUST link to a mandatory `payeeId`.
    - Payees store geographical (address, lat/long) and demographic data.
    - UI supports an "Expandable Detail" paradigm for quick summaries.
- **Categorical Hierarchy**:
    - Pre-seeded, high-quality category tree (Housing, Food, etc.).
    - Support for custom user extensions.
- **Entry Flow (MS Money Inspired)**:
    - Pinned transaction entry form at the bottom of the ledger.
    - Modal-based split entry with flexible balancing (Adjust Total vs. Add Balancing Split).
    - **Welcome Wizard**: First-time users are guided through creating their first account with a step-by-step wizard featuring account type selection (Checking, Savings, Credit, Cash) and account details form.

### **2.5 Automated Quality Assurance (Playwright)**

Hermetic End-to-End testing to ensure ledger integrity.

- **Mock Auth Strategy**: Use environment-injected session cookies to bypass real SSO during automated runs.
- **Verification Coverage**: Critical CRUD flows, persistent state across refreshes, and auto-sync triggers.

## **3. 4-Week Project Roadmap**

### **Week 1: The Domain Layer (Core Engine)**

- **Primary Task:** Framework-agnostic TypeScript logic.
- **Deliverable:** src/core/TransactionEngine.ts and src/core/QIFParser.ts.
- **Validation:** 100% test coverage on split-validation and projection math.

### **Week 2: The Interface (High-Density Ledger)**

- **Primary Task:** Build the "Bloomberg" style UI.
- **Deliverable:** A virtualized ledger using TanStack Table and shadcn/ui.
- **UX Goal:** Keyboard-first navigation (Arrow keys for rows, 'Enter' to edit).

### **Week 3: Ownership (Storage & Security)**

- **Primary Task:** Integration of SSO and Storage Providers.
- **Deliverable:** GoogleDriveProvider.ts and ICloudProvider.ts.
- **Security:** Implementation of the Master Key derivation from the user's SSO ID to unlock the AES-GCM encrypted SQLite file.

### **Week 4: Deployment & Polish**

- **Primary Task:** Vercel deployment and PWA setup.
- **Deliverable:** A production-ready URL. Setup of a "Demo Mode" with mock data for recruiters.

## **4. Open Source & IP Strategy**

- **Public Repo:** @path-logic/core. Contains the framework-agnostic engine, QIF parser, and math utilities. (Demonstrates "Principal" library-building skills).
- **Private Repo:** path-logic-app. Contains the Next.js UI, the Google/Apple API keys, and the branding. (Protects your IP and commercial potential).

## **5. Multi-Platform Expansion (React Native)**

### **5.1 Platform Strategy**

- **Phase 1 (Web PWA)**: Prove the core engine and UX. Deploy to Vercel.
- **Phase 2 (React Native)**: Create `apps/mobile` in the monorepo. Import the exact same `@path-logic/core`.
- **Phase 3 (Platform Adapters)**: Implement native storage providers.

### **5.2 CloudKit JS Constraints (Web)**

**Critical Limitation**: CloudKit JS does NOT support background sync. The web app must be open to sync.

| Feature                 | Native CloudKit (iOS)   | CloudKit JS (Web)            |
| :---------------------- | :---------------------- | :--------------------------- |
| **Background Sync**     | ✅ Automatic            | ❌ Manual (app must be open) |
| **Conflict Resolution** | ✅ Advanced (changeTag) | ⚠️ Basic (last-write-wins)   |
| **Push Notifications**  | ✅ Supported            | ❌ Not supported             |

**Impact**: For Apple users with constrained mobile UX (mostly viewing), CloudKit JS is **acceptable**. Power users who need instant cross-device sync should use the native iOS app.

### **5.3 Code Reusability**

- **~90% Shared**: All business logic (`TransactionEngine`, `QIFParser`, `CashflowProjection`) is platform-agnostic TypeScript.
- **~10% Platform-Specific**: SQLite adapter (sql.js vs expo-sqlite), Storage adapter (Web APIs vs Native SDKs), UI components.

## **6. Marketing & Career Promotion**

### **6.1 The Passive Income Pitch**

- **Target:** Power users tired of Mint/Rocket Money.
- **Monetization:** "Pay-Once-Own-Forever" model ($29). No subscription.
- **Messaging:** "Your bank data stays in your Drive. We never see it. We never sell it."

### **6.2 The Job Hunt "Vibe"**

- **LinkedIn Strategy:** Weekly technical deep-dives into "How I solved X in Next.js 15."
- **Resume Bullet:** "Architected a decentralized, local-first finance app using Next.js 15 and Web Crypto, migrating 15 years of Angular architectural rigor into a modern React/Full-Stack ecosystem."
