# Future Mobile Exploration: Advanced & Emergency Administrative Tools

## Overview & Context

This document tables and captures prospective future mobile ideas (originally proposed in item 2.4 of the responsive design review) for evaluation and user research before implementation.

---

## 1. Concept: "Emergency Mode" / Mobile Administrative Tools

### Problem Statement

On mobile smartphones (`< 768px`), complex and destructive administrative workflows (e.g. **Payee Merging**, **Database Restorations**, **Side-by-Side Sync Conflict Diffing**, and **Bank Statement Reconciliation**) are deliberately excluded from standard mobile navigation to prevent accidental data loss and cramped UI squishing.

However, an edge-case power user who travels without a laptop may occasionally encounter a scenario where they urgently need to merge duplicate payees or resolve an un-synced ledger conflict from their phone.

---

## 2. Proposed Future Solutions for Evaluation

### Option A: Nested "Advanced Tools" Section in Settings

- **Location**: [`/settings/advanced-tools`](file:///home/pete/projects/path-logic/app/src/app/pages/settings/settings-page.component.ts)
- **Mechanics**:
    - Hidden behind a secondary confirmation toggle: _"I understand these tools are optimized for tablet/desktop displays."_
    - Provides a single-column, step-by-step wizard for Payee Merging on mobile with high-friction confirmation (e.g. typing "CONFIRM" or two-step review).

### Option B: Responsive "Desktop Mode" Viewport Override

- **Location**: Profile / Footer quick toggle
- **Mechanics**:
    - Sets a user preference `forceDesktopLayout = true`.
    - Enables horizontal scrolling and forces Bloomberg grids and desktop modals to render regardless of viewport width.

### Option C: Mobile-First Stepped Conflict & Merge Wizards

- **Mechanics**:
    - Redesigning conflict resolution and merging into a multi-step card stack:
        - Step 1: Select Duplicate Card
        - Step 2: Select Primary Card
        - Step 3: Swipe through conflicting fields one by one (Tinder/Card stack style)
        - Step 4: Summary & Atomic Commit

---

## 3. Validation Metrics & Criteria for Promotion

Before prioritizing any of these options into active development:

1. **User Demand**: Track analytics / feedback requests for mobile merge and conflict actions.
2. **Touch Error Rate**: Conduct usability testing on small screens (390px) to verify zero unintended destructive actions.
3. **PWA Standalone Utility**: Assess whether native iOS/Android companion app (Phase 2 React Native) makes mobile administrative workflows redundant.
