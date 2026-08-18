# Path Logic: Multi-Tier Viewport Testing Strategy

## 1. Overview & Objectives

This specification outlines the comprehensive testing strategy designed to enforce the **Path Logic Viewport Feature & Capability Matrix** across every supported device form factor:

- 📱 **Small Viewports (`< 768px`)**: Mobile Smartphones / **Touch-Only** Interaction
- 📟 **Medium Viewports (`768px – 1023px`)**: Tablets & 2-in-1s / **Touch & Pointer** Interaction
- 💻 **Large Viewports (`1024px+`)**: Desktop & Laptop Workstations / **Mouse & Keyboard-First** Interaction

The strategy verifies three distinct quality dimensions:

1. **Feature Gating**: Positive assertions (features render where approved) and negative assertions (features are 100% removed from the DOM via `@if` where unapproved).
2. **Visual & Ergonomic Integrity**: Zero horizontal scroll overflow, 44px+ touch targets on mobile, and theme parity (Light/Dark).
3. **Behavioral Performance**: Keyboard-first table editing on desktop, touch sheet interactions on mobile, and penny-perfect financial math calculations.

---

## 2. Test Execution Matrix by Viewport Tier

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TESTING STRATEGY TIERS                                    │
├───────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    Tier 1: Unit & Component   │    Tier 2: Storybook Play   │   Tier 3: Playwright E2E      │
│  (Vitest / Signal Assertions) │  (Visual / A11y / Theming)  │ (Multi-Viewport Device Matrix)│
├───────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Signal-driven @if inclusion │ • Interaction play tests    │ • 35 Viewport Device Matrix   │
│ • Window resize listeners     │ • Multi-theme parameters    │ • Zero horizontal overflow    │
│ • Penny-perfect balance math  │ • Touch target inspection   │ • Negative DOM assertions     │
│ • Routing & navigation events │ • A11y axe-core compliance  │ • Keyboard ledger traversal   │
└───────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 3. The Three Verification Pillars

### Pillar 1: Structural & DOM Omission Verification (Positive & Negative Assertions)

Features restricted to larger screens must be **completely excluded from the DOM** (`@if`), not merely hidden with CSS `display: none`, ensuring assistive technology and keyboard focus cannot access inactive workflows.

| Feature Under Test                  |      Approved Viewports       | Unapproved Viewports  | Positive Assertion (Approved)                                           | Negative Assertion (Unapproved)                                    |
| :---------------------------------- | :---------------------------: | :-------------------: | :---------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **Payee Merging Buttons & Dialog**  | Tablet / Desktop (`>= 768px`) |  Mobile (`< 768px`)   | `expect(page.locator('button:has-text("Merge Payees")')).toBeVisible()` | `expect(page.locator('payee-merge-dialog')).not.toBeAttached()`    |
| **QIF / CSV File Import**           | Tablet / Desktop (`>= 768px`) |  Mobile (`< 768px`)   | `expect(page.locator('button:has-text("Import QIF")')).toBeVisible()`   | `expect(page.locator('express-import-dialog')).not.toBeAttached()` |
| **Statement Reconciliation Wizard** | Tablet / Desktop (`>= 768px`) |  Mobile (`< 768px`)   | `expect(page.locator('button:has-text("Reconcile")')).toBeVisible()`    | `expect(page.locator('reconciliation-dialog')).not.toBeAttached()` |
| **Mobile Fast Entry FAB**           |      Mobile (`< 768px`)       | Desktop (`>= 1024px`) | `expect(page.locator('#quick-entry-fab')).toBeVisible()`                | `expect(page.locator('#quick-entry-fab')).not.toBeAttached()`      |
| **Mobile Split Editor Route**       |      Mobile (`< 768px`)       |          N/A          | `expect(page).toHaveURL(/\/splits/)`                                    | Modal dialog on desktop                                            |

---

### Pillar 2: Visual & Ergonomic Verification

1. **Zero Horizontal Overflow Rule**:
    - On every page (`/`, `/accounts`, `/accounts/:id`, `/payees`, `/recurring`, `/settings`), the document must not induce horizontal scrolling:

    ```typescript
    const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isOverflowing).toBe(false);
    ```

2. **44px Minimum Touch Target Rule**:
    - All interactive elements (buttons, links, inputs, selects, list toggles) on mobile viewports must meet or exceed WCAG 2.1 Level AAA 44x44px bounding boxes:

    ```typescript
    const box = await element.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    ```

3. **Theme Parity (Light vs Dark Mode)**:
    - Ensure high contrast ratios (>= 4.5:1 for standard text, >= 7:1 for financial amounts) and proper CSS custom property propagation across both color schemes.

---

### Pillar 3: Behavioral & Interaction Verification

1. **Desktop Keyboard-First Navigation**:
    - Verify <kbd>Tab</kbd> moves cell-to-cell in the virtualized ledger table.
    - Verify <kbd>Enter</kbd> commits an inline cell edit.
    - Verify <kbd>Esc</kbd> cancels an inline cell edit without state mutation.
2. **Mobile Touch Workflows**:
    - Fast Entry Bottom Sheet opens smoothly on mobile tap.
    - Tapping "Split Transaction" on mobile navigates to `/accounts/:id/transactions/:txId/splits`.
    - Dynamic math validation updates the balance chip in real time:
        - `Balanced`: Green badge + "Save Splits" button enabled.
        - `Unbalanced`: Amber/Red badge + "Save Splits" button disabled + "Auto-Fill" button active.

---

## 4. Automated Test Suites & Commands

### 4.1 Unit & Component Tests (Vitest)

```bash
npm run test
```

- **Coverage**: Store reactivity, currency formatting, split math invariants, and `@if (isMediumOrLarge())` DOM inclusion/exclusion.

### 4.2 Storybook Test Runner (A11y & Play Tests)

```bash
npm run build-storybook && npm run test-storybook
```

- **Coverage**: Component rendering, dark mode parameters, interactive userEvent plays, and automated axe-core accessibility scans.

### 4.3 Playwright Multi-Viewport Matrix (E2E)

```bash
AGENT=1 npx playwright test -c e2e/playwright.config.ts e2e/src/flows/responsive-matrix.spec.ts
```

- **Coverage**: 35 standardized device viewports validating positive rendering, negative DOM omission, zero horizontal overflow, and 44px touch targets.
