# Path Logic: Design System & Visual Language

This document defines the technical and aesthetic "Constitution" for Path Logic's UI. It ensures a consistent, premium, and functional experience across the application.

## 1. Core Principles

- **High-Density, High-Utility**: Optimized for efficient data viewing (Bloomberg-style).
- **Premium Aesthetics**: Soft shadows, subtle borders, and harmonious color palettes.
- **Precision Typography**: Minimalist and readable, leveraging modern sans-serif fonts.
- **User-Owned feel**: The interface should feel like a professional tool, not a generic consumer app.

### 1.1 Branding & Logo

The "Path Logic" wordmark must strictly follow these rules whenever it appears in the UI:

- **Color Split**: The word "Path" uses the current foreground color, while "Logic" must always use the `primary` color (e.g., `text-primary`).
- **Typography**:
    - Wordmark must be `uppercase`.
    - Preferred tracking is `tracking-tight` or `tracking-tighter`.
    - Font weight should be `font-bold` or `font-black`.
- **Implementation**: `<span className="text-primary">Logic</span>`.

## 2. Layout & Spacing

### Standard Card Rule

All primary content containers (Cards) must follow these parameters:

- **Rounding**: `rounded-lg` (8px).
- **Borders**: `border-border/50` (Subtle 1px border).
- **Card Variants**:
    - **Interactive**:
        - Featured in: Selection grids, Jump links, primary actionable items.
        - Features: `3px` absolute-positioned top bar (`accentColor`), scale/shadow hover effects.
        - Default: `40%` accent opacity, `100%` on hover.
    - **Non-Interactive**:
        - Featured in: Form containers, settings panels, information displays.
        - Features: Clean border and shadow only, no top accent, no hover translation.
- **Padding**: Standard `p-6`, specific headers/footers `px-6`.

## 3. Typography

- **Headers**: `font-bold text-foreground`
    - Page Titles: `text-2xl` or `text-3xl`
    - Section Headers: `text-xl`
    - Sub-heads: `text-lg`
- **Labels**: `text-[10px] font-bold text-muted-foreground uppercase tracking-widest`
    - Used for form fields and list headers.
- **Body**: `text-sm text-muted-foreground` or `text-foreground`.
- **In-App Data**: `font-mono` for currency, percentages, and dates to ensure alignment.

## 4. Components

### Form Fields

- **Input Height**: `h-11` (Refined, slightly taller than standard for better touch targets and premium feel).
- **Input Background**: `bg-muted/30` or transparent with borders.
- **Focus States**: `ring-1 ring-primary border-primary` with smooth transitions.

### Buttons

- **Standard Height**: `h-11`
- **Case**: `uppercase` for primary actions with `tracking-widest`.
- **Weight**: `font-bold` for clarity.

## 5. Interactivity & Cursors

To maintain the "Native App" feel and prevent accidental text selection artifacts:

- **Editable Inputs**: Use the I-Beam cursor (`cursor-text`). This is the only place where text-entry cursors are allowed.
- **Static Text**: All other text elements (Headers, Body, Labels) must use the default cursor (`cursor-default`).
- **Action Buttons**: Buttons should use the default cursor (`cursor-default`). Hand pointers are reserved for navigation.
- **Navigation Elements**: Links and sidebar items should use the pointer cursor (`cursor-pointer`).

## 6. Implementation (Living Style Guide)
