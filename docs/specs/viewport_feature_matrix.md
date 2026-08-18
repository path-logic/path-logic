# Path Logic: Viewport Feature & Capability Matrix

This specification defines the comprehensive breakdown of all application features, views, workflows, and dialogs in **Path Logic**, categorizing their target availability, form-factor adaptations, and interaction models across three standardized viewport tiers:

- 📱 **Small Viewports (`< 768px`)**: Mobile Smartphones / **Touch-Only** Interaction
- 📟 **Medium Viewports (`768px – 1023px`)**: Tablets & Compact Convertibles / **Touch & Pointer** Interaction
- 💻 **Large Viewports (`1024px+`)**: Desktop & Laptop Workstations / **Mouse & Keyboard-First** Interaction

---

## 1. Interaction Paradigms & Form-Factor Principles

### 1.1 Small Viewports (`< 768px` — Mobile Smartphone / Touch-Only)

- **Primary Input**: Single-hand thumb gestures, touch taps, and mobile OS virtual keyboards.
- **Target Ergonomics**:
    - **44px Minimum Touch Targets**: Enforced on all buttons, select inputs, and interactive list items.
    - **Bottom Sheets over Centered Modals**: Fast single-entity data entry utilizes swipeable bottom sheets to prevent content squishing and backdrop lockups when virtual keyboards expand.
    - **Routed Full-Page Forms (`/new`, `/:id/edit`, `/splits`)**: Multi-field entity creation (Accounts, Payees, Recurring Schedules, and Split Transactions) routes to dedicated full-page views to guarantee clean vertical scrolling without modal clipping.
    - **Card Streams & Timelines**: High-density tables are transformed into readable, swipeable card streams with sticky date headers.
    - **Complete DOM Removal of Unapproved Tools**: High-risk, irreversible multi-step operations (e.g. **Payee Merging**, **Statement Reconciliation**, and **QIF / CSV File Import**) are completely removed from the DOM (`@if`) to prevent accidental destruction, screen reader clutter, or cramped layout errors.

### 1.2 Medium Viewports (`768px – 1023px` — Tablet & 2-in-1 / Touch & Pointer)

- **Primary Input**: Dual-hand touch, stylus/pencil, and trackpad/mouse accessories (e.g. iPad Magic Keyboard).
- **Target Ergonomics**:
    - **Adaptive 2-Column Grids**: Dashboards, account lists, and summary cards arrange into dual-column layouts.
    - **Modal Wizards**: Full dialog workflows (Account creation, Payee editing, Payee Merging, and Split Entry) open in centered backdrop dialogs (`z-[100]`) with comfortable padding.
    - **Touch-Friendly Tables**: Compact tabular views with generous row heights (48px+) and clear action icons.
    - **Complete Feature Availability**: Full management features (including Payee Merging, QIF Import, and Statement Reconciliation) are active and fully supported.

### 1.3 Large Viewports (`1024px+` — Desktop Workstation / Mouse & Keyboard)

- **Primary Input**: Precision mouse pointer and high-speed mechanical/laptop keyboards.
- **Target Ergonomics**:
    - **Bloomberg-Style High-Density Tables**: Virtualized TanStack-style ledger grids with 10+ visible columns, tight typography, and sorting/filtering.
    - **Keyboard-First Inline Editing**: Direct in-cell navigation (<kbd>↑</kbd>, <kbd>↓</kbd>, <kbd>Tab</kbd> to traverse columns, <kbd>Enter</kbd> to commit, <kbd>Esc</kbd> to discard).
    - **Side-by-Side Split Views**: Multi-panel layouts (e.g. Statement Reconciliation showing Ledger on the left and Statement Checklist on the right; Payee Merge showing Side-by-Side entity comparison).
    - **Drag-and-Drop Dropzones**: Direct QIF/CSV file dropzones on the ledger screen.

---

## 2. Comprehensive Feature Matrix: Small vs Medium vs Large Viewports

| Feature Area              | Specific Capability               |   Small (`<768px`)<br>_(Mobile / Touch)_   | Medium (`768px–1023px`)<br>_(Tablet / Touch & Pointer)_ | Large (`1024px+`)<br>_(Desktop / Mouse & Keyboard)_ | Form-Factor UX Adaptation & Behavior                                                                               |
| :------------------------ | :-------------------------------- | :----------------------------------------: | :-----------------------------------------------------: | :-------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------- |
| **Portfolio & Dashboard** | **Net Position & Balance Cards**  |              ✅ Stacked Cards              |                    ✅ 2-Column Grid                     |               ✅ 4-Column Header Grid               | Stacked high-contrast cards on mobile; multi-metric horizontal grid on desktop.                                    |
|                           | **90-Day Cashflow Forecast**      |            ⚠️ Compact Sparkline            |                ✅ Interactive Area Chart                |             ✅ Interactive Multi-Series             | Touch-scrub curve on mobile; hover tooltip curve with daily delta breakdowns on desktop.                           |
|                           | **Quick Entry Trigger**           |      ✅ Floating Action Button (FAB)       |                 ✅ Header Action Button                 |               ✅ Header Action Button               | Floating circular thumb-button (bottom right) on mobile; prominent top header button on tablet/desktop.            |
|                           | **Quick Entry Form**              |           ✅ Bottom Sheet Modal            |                   ✅ Centered Dialog                    |                 ✅ Centered Dialog                  | Bottom sheet modal with 44px touch targets on mobile; modal dialog on tablet/desktop.                              |
|                           | **Account Quick Cards**           |         ✅ Vertically Stacked Feed         |                    ✅ 2-Column Grid                     |           ✅ Multi-Column Sparkline Grid            | Scrollable cards with touch feedback on mobile; dense grid with mini sparklines on desktop.                        |
|                           | **Drive & Sync Alerts**           |             ✅ Top Alert Strip             |                   ✅ Top Alert Strip                    |                 ✅ Top Alert Strip                  | High-contrast notice bar across all screen sizes.                                                                  |
| **Accounts Directory**    | **Account List & Balances**       |           ✅ Grouped Card Stream           |                ✅ Compact Table / Cards                 |                ✅ High-Density Table                | Card stream with tap-to-drilldown on mobile; Bloomberg grid with inline balance totals on desktop.                 |
|                           | **Add Account**                   |   🔄 Routed Full Page (`/accounts/new`)    |                     🪟 Modal Dialog                     |                   🪟 Modal Dialog                   | Dedicated page prevents keyboard squish on mobile; dialog modal on tablet/desktop.                                 |
|                           | **Edit Account**                  | 🔄 Routed Full Page (`/accounts/:id/edit`) |                     🪟 Modal Dialog                     |                   🪟 Modal Dialog                   | Full-page form on mobile; centered modal on tablet/desktop.                                                        |
|                           | **Loan / Mortgage Calculator**    |          ⚠️ Monthly Summary Badge          |                  ✅ Interactive Panel                   |            ✅ Full Amortization Schedule            | Payment summary badge on mobile; interactive schedule table with principal/interest curve on desktop.              |
|                           | **Trashed Account Manager**       |             ⚠️ Simplified List             |                  ✅ Full Drawer Panel                   |                ✅ Full Drawer Panel                 | Soft-delete & restore management accessible across all form factors.                                               |
| **Ledger & Transactions** | **Virtualized Ledger Table**      |          ❌ Replaced by Card Feed          |               ✅ Compact Grid (48px rows)               |               ✅ Full Bloomberg Table               | Dense virtualized multi-column table with keyboard shortcuts on desktop.                                           |
|                           | **Transaction Card Stream**       |          ✅ Optimized Touch Feed           |                  ❌ Replaced by Table                   |                ❌ Replaced by Table                 | Sticky date separators, swipe actions, and clear category badges on mobile.                                        |
|                           | **Inline Cell Keyboard Editing**  |                ❌ Disabled                 |                       ❌ Disabled                       | ✅ Keyboard-First (<kbd>Tab</kbd>/<kbd>Enter</kbd>) | Spreadsheet-style in-cell editing on desktop; tap-to-open bottom sheet on touch devices.                           |
|                           | **Mobile Fast Entry Sheet**       |           ✅ Primary Entry Sheet           |                 ✅ Optional Entry Sheet                 |              ❌ Inline Form Preferred               | Bottom sheet with 44px thumb targets and large numpad on mobile.                                                   |
|                           | **Split-Transaction Editor**      |    🔄 **Routed Full-Page (`/splits`)**     |        🪟 **Modal Dialog (`SplitEntryDialog`)**         |           🪟 **Modal / Multi-Row Inline**           | Dedicated unconstrained vertical form on mobile; modal dialog on tablet/desktop.                                   |
|                           | **In-DOM Payee Combobox**         |           ✅ 44px Touch Targets            |                 ✅ Accessible Combobox                  |               ✅ Accessible Combobox                | Custom in-DOM combobox with 44px targets, badge icons, and full keyboard navigation.                               |
|                           | **Bank Statement Reconciliation** |      ❌ **Removed from DOM (`@if`)**       |                ✅ **Available (768px+)**                |           ✅ **Side-by-Side Split View**            | Side-by-side statement clearing wizard on tablet/desktop; completely removed on mobile.                            |
|                           | **QIF / CSV File Import**         |      ❌ **Removed from DOM (`@if`)**       |                ✅ **Full Import Wizard**                |            ✅ **Drag & Drop File Zone**             | Drag & drop file zone on desktop; full wizard on tablet; completely omitted on mobile.                             |
| **Payee Management**      | **Payee Directory & Search**      |           ✅ Instant Filter Feed           |                 ✅ Instant Filter Feed                  |               ✅ Instant Filter Feed                | Live search across name, city, notes with touch-friendly cards.                                                    |
|                           | **Payee Details Inspection**      |             ✅ Expandable Card             |                      ✅ Split Card                      |               ✅ Side Panel / Drawer                | Address, GPS coordinates, phone, notes in expandable drawer.                                                       |
|                           | **Add / Edit Payee**              |    🔄 Routed Full Page (`/payees/new`)     |                     🪟 Modal Dialog                     |                   🪟 Modal Dialog                   | Full-page form on mobile; modal dialog on tablet/desktop.                                                          |
|                           | **Payee Merging Mechanism**       |      ❌ **Removed from DOM (`@if`)**       |                ✅ **Available (768px+)**                |             ✅ **Available (1024px+)**              | Reassigns transactions and deletes duplicate. Completely omitted from DOM on mobile for safety and layout clarity. |
| **Recurring Schedules**   | **Recurring Directory**           |           ✅ Agenda Card Stream            |               ✅ Split Stream / Calendar                |               ✅ Full Forecast Table                | Upcoming recurrence stream on mobile; multi-column table on desktop.                                               |
|                           | **2-Week Cashflow Calendar**      |                 ❌ Hidden                  |                    ✅ Calendar Grid                     |              ✅ Full Month Matrix Grid              | Day-by-day balance projection matrix on tablet/desktop; hidden on mobile.                                          |
|                           | **Agenda / Next Due Feed**        |              ✅ Primary Feed               |                   ✅ Secondary Panel                    |                 ✅ Secondary Panel                  | Chronological upcoming payment cards on mobile.                                                                    |
|                           | **Add / Edit Schedule**           |   🔄 Routed Full Page (`/recurring/new`)   |                     🪟 Modal Dialog                     |                   🪟 Modal Dialog                   | Dedicated page on mobile; modal dialog on tablet/desktop.                                                          |
| **Sync & Security**       | **Google Drive BYOS Sync**        |            ✅ Background / Auto            |                ✅ Full Status Dashboard                 |              ✅ Full Status Dashboard               | Background encrypted sync across all devices.                                                                      |
|                           | **SQLite Database Backup**        |           ⚠️ Single File Export            |                     ✅ Full Wizard                      |                   ✅ Full Wizard                    | Instant `.db` file download on mobile; inspection wizard on desktop.                                               |
|                           | **Sync Conflict Resolver**        |            ⚠️ Last-Write Prompt            |                  ✅ Side-by-Side Diff                   |                ✅ Side-by-Side Diff                 | Visual side-by-side transaction field diff comparison on tablet/desktop.                                           |
| **Settings & Dev**        | **Theme Switcher**                |           ✅ Dark / Light / Auto           |                 ✅ Dark / Light / Auto                  |               ✅ Dark / Light / Auto                | Smooth CSS variable transitions on all viewports.                                                                  |
|                           | **Developer Seeder & Reset**      |              ⚠️ Settings Page              |                    ✅ Settings Page                     |                  ✅ Settings Page                   | Quick test state reset and mock QIF generator.                                                                     |

---

## 3. Deep-Dive Rationale for Viewport Restrictions

### 3.1 Payee Merging Mechanism

- **Availability**: **Medium (`768px – 1023px`)** and **Large (`1024px+`)** viewports only. Completely removed from the DOM via `@if (isMediumOrLarge())` on Small (`< 768px`) viewports.
- **Rationale**: Destructive administrative reassignment requiring side-by-side entity validation. Removed from mobile to eliminate catastrophic accidental merges and screen reader confusion.

### 3.2 QIF / CSV Import Omission on Mobile

- **Availability**: **Medium (`768px – 1023px`)** and **Large (`1024px+`)** viewports only. Completely removed from the DOM via `@if (isMediumOrLarge())` on Small (`< 768px`) viewports.
- **Rationale**: Banking portals do not provide viable mobile QIF download/import flows to local mobile browsers. Removing the buttons and dialogs keeps mobile ledger headers uncluttered.

### 3.3 Split-Transaction Full-Page Routing on Mobile

- **Availability**: Routed full-page (`/accounts/:id/transactions/:txId/splits`) on Small viewports; Centered modal dialog (`SplitEntryDialogComponent`) on Medium and Large viewports.
- **Rationale**: Editing 4–8 split lines (Gross, Federal Tax, State Tax, 401(k), Insurance) inside a bottom sheet alongside an on-screen virtual keyboard causes severe vertical squishing. A full-height page provides ample room for live penny-perfect math calculation, deduction toggling, and category selection.

### 3.4 Bank Statement Reconciliation Wizard

- **Availability**: Medium and Large viewports only; replaced by simple per-transaction status toggles on Mobile.
- **Rationale**: Dual-pane statement ledger reconciliation requires side-by-side horizontal space for balance differences, cleared deposits, and withdrawals.
