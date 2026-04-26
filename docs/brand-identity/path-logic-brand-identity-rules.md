# Path Logic Finance — Brand Identity & UI/UX Agent Rules

> **System Directive:** This document is the definitive brand, design, and product ruleset for Path Logic Finance. All AI agents generating code, copy, or UI components for this project MUST strictly adhere to every rule below. Violations (wrong colors, wrong tone, wrong layout density) are treated as bugs.

---

## 1. Product Identity

- **Name:** Path Logic Finance
- **Tagline:** *Your bank data stays in your Drive. We never see it. We never sell it.*
- **Model:** Pay-once-own-forever ($29). No subscriptions. No data monetization.
- **Architecture:** Local-first. Client-side WASM SQLite, integer-based split-transaction engine (zero floating-point errors), AES-GCM 256-bit encryption. User-owned cloud sync (Google Drive `appDataFolder` / iCloud).
- **Target Audience:** The Disillusioned Optimizer — tech-savvy professionals, engineers, and financial power users suffering from subscription fatigue and anti-privacy SaaS models.

---

## 2. Brand Voice & Tone

**Persona:** The Knowledgeable Guide — authoritative but approachable. We use precise terminology but never assume the user already knows it.

| Rule | Detail |
|---|---|
| **Precise but Approachable** | Use correct terminology (Ledger, Reconciliation, Split Transaction, AES-GCM) but always provide contextual help for "inside baseball" terms. See §2.1 Glossary Tooltips below. |
| **Transparent & Direct** | No marketing fluff, no superlatives ("best ever!"), no hype. The performance and architecture speak for themselves. |
| **Zero Gamification** | Do NOT use emojis in the UI, "streak" counters, congratulatory modals, confetti animations, or patronizing financial jargon ("You saved $5! 🎉"). |
| **Respectful** | Don't over-explain obvious concepts, but never make the user feel dumb for not knowing a technical term. The tooltip is there for them. |

### 2.1 Glossary Tooltips ("What's This?" Pattern)

Technical, financial, or security terms that a general audience may not know MUST be rendered with a **glossary tooltip** — a dotted-underline indicator that shows a plain-English definition on hover (desktop) or tap (mobile).

**Visual treatment:**
- Dotted underline (`border-bottom: 1px dotted`) in `text-muted` color.
- Cursor changes to `help` on hover.
- Tooltip appears on hover/focus with a short, jargon-free explanation.
- Tooltip uses `bg-elevated` background, `text-primary` text, `border-subtle` border, and a subtle `box-shadow`.

**Example terms and their plain-English definitions:**

| Term | Tooltip Definition |
|---|---|
| AES-GCM 256 | "Military-grade encryption — your data is scrambled so only you can read it." |
| Zero-Knowledge | "We can't see your data, even if we wanted to. Only your device holds the key." |
| Reconciliation | "Matching your records against your bank statement to make sure nothing's missing." |
| Split Transaction | "One payment that covers multiple categories — like a paycheck split into salary, taxes, and insurance." |
| BYOS | "Bring Your Own Storage — your data lives in your Google Drive or iCloud, not on our servers." |
| Ledger | "Your transaction log — every dollar in and out, organized by account." |
| WASM SQLite | "A full database running privately inside your browser — no server needed." |
| Cashflow Projection | "A 90-day forecast of your balance based on your recurring bills and income." |

**Implementation rule:** When generating UI copy that includes any term from this glossary (or similar technical jargon), wrap it in the glossary tooltip component. If a new technical term is introduced, add it to this table.

---

## 3. Color System — Dual Theme

Path Logic supports **two themes**: Dark (default) and Light. The user can toggle between them. Both themes must maintain the same information density and visual hierarchy.

### 3.1 Dark Theme (Default)

The primary aesthetic: deep obsidian, terminal-grade, pro-audio software. Sharp contrast without eye fatigue during long reconciliation sessions.

#### Backgrounds & Surfaces

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#08080A` | Deepest obsidian. Main app background. |
| `bg-surface` | `#121216` | Panels, sidebars, data tables. |
| `bg-elevated` | `#1C1C22` | Modals, dropdowns, command palette. |
| `border-subtle` | `#2A2A35` | Thin dividers, table borders. |

#### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#F1F5F9` | Primary data, headings, figures. |
| `text-muted` | `#94A3B8` | Table headers, secondary text, timestamps. |
| `text-disabled` | `#475569` | Inactive states, placeholders. |

### 3.2 Light Theme

A clean, warm-neutral palette designed for readability in bright environments and users with visual accessibility needs. Must feel equally professional and dense — NOT whitespace-heavy or "bubbly."

#### Backgrounds & Surfaces

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F8F9FA` | Warm off-white. Main app background. |
| `bg-surface` | `#FFFFFF` | Panels, sidebars, data tables. |
| `bg-elevated` | `#F1F3F5` | Modals, dropdowns, command palette. |
| `border-subtle` | `#DEE2E6` | Thin dividers, table borders. |

#### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#1A1A2E` | Deep navy-black. Primary data, headings. |
| `text-muted` | `#64748B` | Table headers, secondary text, timestamps. |
| `text-disabled` | `#ADB5BD` | Inactive states, placeholders. |

### 3.3 Semantic & Accent Colors (Shared Across Themes)

These colors are used identically in both themes unless a specific override is noted. They must be used **sparingly** — strictly mapped to financial meaning.

| Token | Hex | Usage |
|---|---|---|
| `accent-violet` | `#8B5CF6` | Electric Violet. Primary branding, active states, focus rings. |
| `status-pos` | `#10B981` | Emerald. Inflows, positive net worth, credits. |
| `status-neg` | `#EF4444` | Crimson. Outflows, expenses, negative balances, debits. |
| `status-warn` | `#F59E0B` | Amber. Unreconciled transactions, budget alerts. |

> **Light theme override:** In light mode, `status-pos` and `status-neg` may be darkened slightly (e.g., `#059669` and `#DC2626`) to maintain WCAG AA contrast against white/off-white backgrounds.

### 3.4 Theme Implementation Rules

- Implement via CSS custom properties on `:root` (dark) and `[data-theme="light"]` or `.theme-light` class selectors, OR via PrimeNG theme configuration.
- The active theme preference MUST be persisted in the user's settings (stored in IndexedDB via the local persistence layer).
- Respect `prefers-color-scheme` on first load if no user preference is saved.
- NEVER hardcode hex values in component styles. Always reference design tokens.

---

## 4. Typography System

Fonts must support high-density data and extreme legibility at small sizes.

| Role | Font | Weights | Usage |
|---|---|---|---|
| **Primary / Headings** | Outfit | Medium (500), SemiBold (600), Bold (700) | Dashboard figures, section titles, marketing headers. |
| **Secondary / UI / Data** | Inter | Regular (400), Medium (500) | Row data, forms, navigation, microcopy. |
| **Tertiary / Code** | JetBrains Mono | Regular (400) | Transaction IDs, encryption keys, raw JSON exports. *(Optional but recommended)* |

### Typography Rules

- **Tabular numbers are mandatory.** Enable `font-variant-numeric: tabular-nums` in CSS for ALL financial figures so decimal points align perfectly in table columns.
- **Never use the browser's default font stack.** Always load Outfit and Inter via Google Fonts or self-host.
- **Minimum body text size:** 13px for data tables, 14px for form labels and UI text.

---

## 5. Iconography

| Rule | Detail |
|---|---|
| **Library** | Lucide or Phosphor Icons only. |
| **Style** | Sharp, geometric, monoline. |
| **Stroke Width** | 1.5px. Never thick, rounded, or bubbly. |
| **Usage** | Strictly utilitarian: arrows for sorting, chevrons for navigation, lock icons for encryption status. Do NOT use illustrative, cartoonish, or emoji-style icons. |

---

## 6. Layout & Interaction Rules

Path Logic rejects consumer whitespace in favor of **high-density utility**.

| Rule | Detail |
|---|---|
| **Grid & Spacing** | Strict 4px / 8px baseline grid. |
| **Data Density** | Table rows: 24px–32px height. Minimize padding. Maximize transactions visible per screen. |
| **Border Radius** | Sharp. Maximum `4px` (`rounded-sm`). No pill-shaped buttons. No excessive rounding. |
| **Shadows** | Minimal. Prefer border-based elevation over shadow-based elevation. |

### Keyboard-First Navigation

- **Command Palette:** `CMD+K` / `CTRL+K` for global search and navigation.
- **Standardized hotkeys:** `N` = new transaction, `R` = toggle reconciliation, `Arrow keys` = grid row/cell navigation, `Enter` = edit focused row, `Escape` = cancel/close.
- **Tab order:** Must follow logical reading order. All interactive elements must be reachable via Tab.

### Performance

- All hover states, color shifts, and micro-animations must complete in **< 100ms**.
- UI should feel like hardware — instant, deterministic, zero perceived latency.
- Use CSS transitions (`transition: 80ms ease-out`) not JS-driven animation libraries for simple state changes.

---

## 7. Accessibility (A11y)

| Rule | Detail |
|---|---|
| **Color Independence** | NEVER rely on color alone to convey financial data. Positive numbers get a `+` prefix. Negative numbers get a `-` prefix or parentheses `()`. |
| **Contrast Ratios** | All text must meet **WCAG 2.1 AA** minimum (4.5:1 for normal text, 3:1 for large text). Verify in both dark and light themes. |
| **Focus Rings** | Mandatory. Use a sharp `2px solid #8B5CF6` (Electric Violet) offset outline on all focusable elements. NEVER set `outline: none` without providing an equivalent visible focus indicator. |
| **ARIA Labels** | All icon-only buttons must have `aria-label`. All data tables must have proper `role`, `aria-sort`, and column headers. |
| **Reduced Motion** | Respect `prefers-reduced-motion: reduce`. Disable all non-essential animations when this media query matches. |

---

## 8. Responsiveness

The experience is **Desktop-Class First**. Mobile is supported but data density is never sacrificed for simplistic "mobile-friendly" layouts.

| Breakpoint | Behavior |
|---|---|
| **Desktop (> 1024px)** | Primary environment. Full data density, multi-column layouts, persistent sidebars, complex visualizations. |
| **Tablet (768px – 1024px)** | Collapse sidebars into icon-only rails or drawer overlays. Maintain data table structure. |
| **Mobile (< 768px)** | Do NOT collapse data tables into bulky, whitespace-heavy "cards." Use horizontally scrollable tables with sticky first columns (Date / Payee). Optimize numeric inputs for integer-entry keypads. |

---

## 9. Component & Code Generation Rules

When generating Angular components, services, or templates for Path Logic, the following rules apply in addition to the project's `tsconfig` and ESLint configuration:

- **Framework:** Angular 21, standalone components, Signals-based state.
- **Styling:** Tailwind CSS utility classes. Reference design tokens defined in the Tailwind config — never hardcode hex values.
- **State:** Zustand with Immer middleware for the ledger store. Angular Signals for component-level reactivity.
- **Math:** Use integer-based arithmetic (cents) or `Big.js` for all financial calculations. Floating-point (`number * number`) is FORBIDDEN for money.
- **Encryption:** AES-GCM 256-bit via Web Crypto API. Never store plaintext financial data in cloud storage.
- **Testing:** All business logic in `@path-logic/core` must have comprehensive unit tests. Use descriptive `describe`/`it` blocks.
- **Documentation:** Follow the project's existing JSDoc patterns. All public APIs must be documented.