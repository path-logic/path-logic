# Technical Specifications: UI Implementation

## 1. Frontend Framework & Architecture

Path Logic is built as a high-performance Progressive Web App (PWA) using modern React patterns.

- **Framework**: Next.js 15 (App Router).
- **Language**: TypeScript with `strict` mode enforced.
- **Styling**: Tailwind CSS for high-performance, utility-first design.
- **Component Library**: shadcn/ui for consistent, accessible primitives (Modals, Toasts, Inputs).

## 2. Terminal-Grade Ledger Implementation

The ledger is the primary performance bottleneck and requires specialized handling.

- **Table Logic**: **TanStack Table (v8)**. Used for headless table state management (sorting, filtering, selection).
- **Virtualization**: **TanStack Virtual**. Essential for domesticating the "terminal" feel with 10k+ rows while keeping 60fps scrolling and a small DOM footprint.
- **Row Memoization**: Custom `React.memo` wrappers for row components to prevent unnecessary re-renders during filter/search operations.
- **Calculated Columns**: Cumulative running balances are computed across the entire sorted dataset (pre-windowing) to ensure accuracy regardless of the months shown.

## 3. Viewport & Layout Management

To achieve the "Bloomberg" aesthetic, the layout is strictly constrained to the user's viewport.

- **Container Strategy**: Root container uses `h-screen overflow-hidden flex flex-col`.
- **Vertical Constraint**: Nested flex containers use `min-h-0` and `flex-1` to force components to respect their parent's bounds, triggering internal scrollbars rather than page-level scrolls.
- **Responsive Design**: Mobile-first adaptive layout. Grid-cols shift from 12 (desktop) to 1 (mobile) with a collapsible account sidebar.

## 4. State Management Lifecycle

Local-first state management requires intermediate buffering before storage provider sync.

- **Store**: Zustand with `immer` middleware for immutable transaction updates.
- **Persistence**: Zustand `persist` middleware coupled with a custom SQLite storage engine.
- **Ledger Updates**:
    - Optimistic updates for local edits.
    - Debounced "Auto-Save" to the Storage Provider (Google Drive/iCloud) to prevent rate limiting.

## 5. Performance Optimizations

- **Asset Loading**: SVGs for all indicators (no icon fonts).
- **CSS Strategy**: Zero-runtime CSS via Tailwind to minimize Main Thread blocking.
- **Hydration Safety**: Use of `useEffect` mounted-state patterns for dynamic time/date strings to prevent SSR mismatches.
