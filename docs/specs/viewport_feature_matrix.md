# Path Logic: Viewport Feature & Capability Matrix

This document defines the comprehensive breakdown of all application features, views, workflows, and dialogs in **Path Logic**, categorizing their target availability, form-factor adaptations, and rationale across three standardized viewport tiers:

- 📱 **Mobile** (`< 768px`, e.g. iPhone 14/15/SE, Pixel 7/8)
- 📟 **Tablet / Medium** (`768px – 1023px`, e.g. iPad, iPad Mini, Surface portrait)
- 💻 **Desktop / Large** (`1024px+`, e.g. MacBook, 1440p/4K Workstations)

---

## 1. Executive Summary & Responsive Design Principles

Path Logic operates on a **Local-First, High-Density, Mobile-Complementary** architectural philosophy:

1. **Desktop / Large Viewports (`1024px+`)**: Power-user workflow center with dense Bloomberg-style grids, multi-column split transaction inline editors, side-by-side reconciliation dialogs, full-database export/import, and administrative batch actions (e.g. Payee Merging).
2. **Tablet / Medium Viewports (`768px – 1023px`)**: Adaptive touch-and-pointer experience with interactive calendar matrices, modal dialogs, touch-optimized tables, and complete management features.
3. **Mobile Viewports (`< 768px`)**: Quick-capture, high-clarity on-the-go experience with bottom sheets, 44px minimum touch targets, simplified stream cards, single-column forms routed to dedicated paths (`/new`, `/edit`), hiding high-cognitive-load or multi-step bulk data administrative operations.

---

## 2. Feature & Capability Availability Matrix

| Feature Area              | Specific Capability                  |         Mobile (<768px)          |   Tablet (768px-1023px)   |     Desktop (1024px+)      | UX Adaptation / Form Factor                                                                                                   |
| :------------------------ | :----------------------------------- | :------------------------------: | :-----------------------: | :------------------------: | :---------------------------------------------------------------------------------------------------------------------------- |
| **Portfolio & Dashboard** | Net Position & Balance Cards         |                ✅                |            ✅             |             ✅             | Multi-column grid on Desktop; stacked summary cards on Mobile                                                                 |
|                           | 90-Day Cashflow Forecast Chart       |          ⚠️ Simplified           |          ✅ Full          |          ✅ Full           | Simplified single-series sparkline on Mobile; full multi-series interactive area chart on Tablet/Desktop                      |
|                           | Quick Entry Trigger Button           |          ✅ Primary FAB          |     ✅ Header Action      |      ✅ Header Action      | Floating bottom-right Action Button on Mobile; prominent header action on Tablet/Desktop                                      |
|                           | Quick Entry Modal / Form             |         ✅ Bottom Sheet          |      ✅ Modal Dialog      |      ✅ Modal Dialog       | Swipe-friendly full-width bottom sheet on Mobile; centered backdrop modal on Desktop                                          |
|                           | Account Sparklines & Cards           |            ✅ Stacked            |       ✅ 2-Col Grid       |      ✅ 3/4-Col Grid       | Horizontally scrollable or stacked on mobile                                                                                  |
|                           | Sync & Drive Reauth Banners          |            ✅ Banner             |         ✅ Banner         |         ✅ Banner          | Responsive alert bar at top of layout                                                                                         |
| **Accounts Directory**    | Account List & Balances              |        ✅ Sectioned Cards        |     ✅ Table / Cards      |      ✅ Table / Cards      | High-density rows on Desktop; touchable cards with clear balance badges on Mobile                                             |
|                           | Add Account Workflow                 |   🔄 Routed (`/accounts/new`)    |      🪟 Modal Dialog      |      🪟 Modal Dialog       | Dedicated full-page form on mobile to prevent modal keyboard squishing                                                        |
|                           | Edit Account Workflow                | 🔄 Routed (`/accounts/:id/edit`) |      🪟 Modal Dialog      |      🪟 Modal Dialog       | Full-page form on mobile; modal dialog on tablet/desktop                                                                      |
|                           | Loan / Mortgage Amortization         |         ⚠️ Summary Only          |      ✅ Interactive       |       ✅ Interactive       | Basic monthly payment & balance on mobile; full amortization schedule table on desktop                                        |
|                           | Trashed / Archive Account Manager    |          ⚠️ Basic list           |      ✅ Full Drawer       |       ✅ Full Drawer       | Soft-delete & restore accessible across all devices                                                                           |
| **Ledger & Transactions** | High-Density Virtual Ledger Table    |           ❌ Replaced            |     ✅ Compact Table      |  ✅ Full Bloomberg Table   | Virtualized TanStack-style dense table with keyboard navigation on Desktop                                                    |
|                           | Mobile Card Stream & Feed            |        ✅ Optimized Feed         |        ❌ Replaced        |        ❌ Replaced         | Touch-friendly expandable transaction cards with date sticky headers on Mobile                                                |
|                           | Inline Ledger Row Editing            |           ❌ Disabled            |        ❌ Disabled        |     ✅ Keyboard-First      | Direct in-cell editing (<kbd>Enter</kbd> to save, <kbd>Tab</kbd> to next column) on Desktop                                   |
|                           | Mobile Fast Entry Bottom Sheet       |         ✅ Full Feature          |     ✅ Optional Sheet     |   ❌ Replaced by Inline    | Thumb-friendly bottom sheet with large 44px inputs on Mobile/Tablet                                                           |
|                           | Split Transaction Editor             |          ⚠️ Basic Sheet          |      ✅ Modal Wizard      |    ✅ Multi-row Inline     | Multi-row balanced sub-ledger editor (Gross, Tax, Insurance) on Desktop/Tablet                                                |
|                           | In-DOM Payee Combobox                |        ✅ Touch-friendly         |     ✅ Full Combobox      |      ✅ Full Combobox      | Custom accessible in-DOM dropdown with 44px touch targets on Mobile                                                           |
|                           | Bank Statement Reconciliation Wizard |       ❌ Disabled / Notice       |      ✅ Modal Wizard      |     ✅ Full Split View     | Complex side-by-side statement clearing wizard restricted to Tablet & Desktop                                                 |
|                           | QIF / CSV File Import & Mapping      |       ⚠️ File picker only        |      ✅ Full Wizard       |    ✅ Drag & Drop Zone     | Full preview & deduplication hash review on Tablet/Desktop; basic file pick on mobile                                         |
| **Payee Management**      | Payee Directory & Search             |        ✅ Searchable List        |    ✅ Searchable List     |     ✅ Searchable List     | Instant filtering by name, city, notes                                                                                        |
|                           | Payee Details Drawer / Card          |        ✅ Expandable Card        |       ✅ Split Card       |    ✅ Side Panel / Card    | Address, GPS coordinates, contact details                                                                                     |
|                           | Add Payee                            |    🔄 Routed (`/payees/new`)     |      🪟 Modal Dialog      |      🪟 Modal Dialog       | Dedicated clean page on mobile; modal on tablet/desktop                                                                       |
|                           | Edit Payee                           |  🔄 Routed (`/payees/:id/edit`)  |      🪟 Modal Dialog      |      🪟 Modal Dialog       | Dedicated clean page on mobile; modal on tablet/desktop                                                                       |
|                           | **Payee Merging Mechanism**          |      ❌ **Hidden (<768px)**      | ✅ **Available (768px+)** | ✅ **Available (1024px+)** | Reassigns transactions/schedules and deletes duplicate. Restricted to medium/large viewports for safety and ergonomic clarity |
| **Recurring Schedules**   | Recurring List & Frequency Stream    |           ✅ List View           |       ✅ Split View       |       ✅ Full Table        | Clear recurrence badges (monthly, bi-weekly, etc.)                                                                            |
|                           | 2-Week Calendar Forecast Matrix      |            ❌ Hidden             |     ✅ Calendar Grid      |    ✅ Full Month Matrix    | High-density day-by-day cashflow balance calendar on Tablet/Desktop                                                           |
|                           | Agenda / Next Due Feed               |         ✅ Primary View          |     ✅ Secondary View     |     ✅ Secondary View      | Chronological list of upcoming due transactions on Mobile                                                                     |
|                           | Add / Edit Recurring Schedule        |   🔄 Routed (`/recurring/new`)   |      🪟 Modal Dialog      |      🪟 Modal Dialog       | Full-page form on mobile; modal dialog on tablet/desktop                                                                      |
| **Sync & Backup**         | Google Drive BYOS Sync               |       ✅ Background / Auto       |      ✅ Full Status       |       ✅ Full Status       | Automated local-first SQLite sync to user's Google Drive                                                                      |
|                           | SQLite Database Export / Import      |       ⚠️ Export file only        |      ✅ Full Wizard       |       ✅ Full Wizard       | Raw database backup file download on mobile; full conflict inspector on desktop                                               |
|                           | Sync Conflict Resolution Tool        |       ⚠️ Last-Write Prompt       |   ✅ Side-by-Side Diff    |    ✅ Side-by-Side Diff    | Visual side-by-side transaction field diff comparison on Tablet/Desktop                                                       |
| **Settings & Developer**  | Theme Switcher (Dark/Light/Auto)     |           ✅ Available           |       ✅ Available        |        ✅ Available        | Full CSS variables and smooth transitions across all viewports                                                                |
|                           | Developer Mock Data Seeder           |         ⚠️ Settings page         |     ✅ Settings page      |      ✅ Settings page      | Quick test state reset & QIF mock generator                                                                                   |

---

## 3. Viewport Breakdown Details & Justifications

### 3.1 Payee Merging Feature Availability

- **Decision**: Enabled on **Medium & Large Viewports (`>= 768px`)**; hidden on Mobile (`< 768px`).
- **Rationale**:
    1. Payee merging is an **administrative, destructive, and permanent operation** that reassigns historical transactions, updates database foreign keys, and soft-deletes records.
    2. The merge comparison flow requires side-by-side visual validation (`[Duplicate: "Starbucks #1234"] ---> [Primary: "Starbucks"]`) and impact analysis (transaction count & schedule count review) which is error-prone on small vertical touch screens.
    3. Power users performing batch cleanups and duplicate resolution naturally perform this work at a desk or on an iPad/tablet.

### 3.2 Bank Statement Reconciliation Wizard

- **Decision**: Available on Tablet and Desktop; replaced by simple status toggling on Mobile.
- **Rationale**: Reconciling against an official PDF or paper bank statement requires viewing multiple columns (Target Ending Balance, Cleared Balance, Difference, Cleared Deposits, Cleared Debits) simultaneously. Small screens do not provide sufficient horizontal space without extreme scrolling friction.

### 3.3 Form Handling (Modal vs Routed Full-Page)

- **Decision**: On Mobile (`< 1024px`), creation/edit actions navigate to dedicated routed pages (`/accounts/new`, `/payees/new`, `/recurring/new`); on Desktop (`1024px+`), creation/edit opens centered modal dialogs.
- **Rationale**: On mobile smartphones, virtual on-screen keyboards cover up to 50% of the viewport. Centered modal dialogs become unusable, squished, or experience scroll-lock bugs. Full-page routed forms provide a natural top-to-bottom thumb flow with native OS virtual keyboard behaviors.

---

## 4. Next Steps for UX & Responsive Auditing

1. **Review Matrix with Engineering & Design**: Validate proposed restrictions and form-factor adaptations.
2. **Automated Viewport Verification**: Ensure all Playwright responsive matrix tests (`e2e/src/flows/responsive-matrix.spec.ts`) validate both visibility on desktop/tablet and clean omission on mobile.
3. **Continuous Enforcement**: Keep this matrix updated as new features (e.g. advanced reports, multi-currency conversion, tax sub-ledger exports) are introduced.
