# Functional Specifications: UI Features

## 1. High-Density Terminal Ledger

The core interaction point for Path Logic is a professional-grade, high-density ledger designed for power users.

- **Visual Style**: "Bloomberg Terminal" aesthetics (dark theme, crisp typography, high contrast color coding for status).
- **Data Density**: Optimized for viewing 50+ transactions at once without scrolling.
- **Categorization**: Visual indicators for categorized vs. uncategorized transactions.
- **Split Visibility**: Transactions with sub-ledger splits must indicate the split count and allow inline expansion.
- **Search & Filter**: Instant, real-time filtering of the visible ledger by payee, memo, category, or amount range.

## 2. QIF / CSV Import Interface

A robust, defensive import workflow that provides immediate feedback.

- **File Selection**: Draggable upload zone and standard file picker.
- **Import States**:
    - **In-Progress**: Full ledger overlay "Processing..." with spinner to block interaction.
    - **Success**: Immediate refresh of the ledger with new transactions highlighted or sorted to top.
    - **Error/Warning**: Toast or modal summary of parsing issues (e.g., "3 transactions skipped due to invalid date format").
- **Deduplication UI**: Visual markers for transactions that were automatically skipped because they matched the existing hash.

## 3. Keyboard-First Navigation

Designed for rapid data entry and verification without a mouse.

- **Navigation**: Arrow keys for row selection.
- **Action**: 'Enter' to open edit/split modal.
- **Shortcuts**:
    - `i`: Trigger Import.
    - `f`: Focus filter/search.
    - `r`: Start reconciliation mode.
    - `Esc`: Close modals/clear filters.

## 4. Financial Status Dashboard (Header)

Real-time "Penny-Perfect" indicators across the top of the viewport.

- **Cleared Balance**: The sum of all reconciled and cleared transactions.
- **Pending/Future Balance**: Sum of all transactions including pending imports.
- **Sync Status**: Indicator for connection to user-owned storage (Google Drive / iCloud).

## 5. Account Management Sidebar

Simplified navigation between multiple financial sources.

- **Account List**: Quick-switch between Bank, Credit Card, and Cash accounts.
- **Balance Summaries**: Each account entry shows its current cleared balance.
- **Active State**: Clear visual indication (e.g., left-border accent) of the currently viewed account.

## 6. 90-Day Cashflow Projection (Visualizer)

A forward-looking charting tool positioned below or adjacent to the ledger.

- **Chart Type**: Time-series area chart showing projective balance over the next 90 days.
- **Data Points**: Derived from Current Balance + Recurring Schedules + Unscheduled Pending items.
- **Threshold Alerts**: Visual indicators (red zones) where balance is projected to fall below zero.
