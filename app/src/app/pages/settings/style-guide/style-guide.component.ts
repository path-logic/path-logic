import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';

interface IColorSwatch {
    token: string;
    hex: string;
    usage: string;
}

interface IFontRole {
    role: string;
    family: string;
    weights: string;
    usage: string;
}

interface ILayoutRule {
    name: string;
    detail: string;
}

/**
 * Visual Constitution page.
 * Displays the application's design system, typography, and UI patterns.
 * All tokens reference the brand identity spec in docs/brand-identity/.
 */
@Component({
    selector: 'style-guide',
    standalone: true,
    imports: [CommonModule, AppShellComponent],
    templateUrl: './style-guide.component.html',
    styleUrls: ['./style-guide.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StyleGuideComponent {
    // ── Color System ──────────────────────────────────────────────────────

    readonly semanticSwatches: Array<IColorSwatch> = [
        {
            token: 'accent-violet',
            hex: '#8B5CF6',
            usage: 'Primary branding, active states, focus rings'
        },
        { token: 'status-pos', hex: '#10B981', usage: 'Inflows, positive net worth, credits' },
        { token: 'status-neg', hex: '#EF4444', usage: 'Outflows, expenses, negative balances' },
        { token: 'status-warn', hex: '#F59E0B', usage: 'Unreconciled transactions, budget alerts' }
    ];

    readonly darkSwatches: Array<IColorSwatch> = [
        { token: 'bg-base', hex: '#08080A', usage: 'Deepest obsidian — main app background' },
        { token: 'bg-surface', hex: '#121216', usage: 'Panels, sidebars, data tables' },
        { token: 'bg-elevated', hex: '#1C1C22', usage: 'Modals, dropdowns, command palette' },
        { token: 'border-subtle', hex: '#2A2A35', usage: 'Thin dividers, table borders' },
        { token: 'text-primary', hex: '#F1F5F9', usage: 'Primary data, headings, figures' },
        { token: 'text-muted', hex: '#94A3B8', usage: 'Table headers, secondary text' }
    ];

    readonly lightSwatches: Array<IColorSwatch> = [
        { token: 'bg-base', hex: '#F8F9FA', usage: 'Warm off-white — main app background' },
        { token: 'bg-surface', hex: '#FFFFFF', usage: 'Panels, sidebars, data tables' },
        { token: 'bg-elevated', hex: '#F1F3F5', usage: 'Modals, dropdowns, command palette' },
        { token: 'border-subtle', hex: '#DEE2E6', usage: 'Thin dividers, table borders' },
        { token: 'text-primary', hex: '#1A1A2E', usage: 'Deep navy-black — primary data' },
        { token: 'text-muted', hex: '#64748B', usage: 'Table headers, secondary text' }
    ];

    // ── Typography ────────────────────────────────────────────────────────

    readonly fontRoles: Array<IFontRole> = [
        {
            role: 'Primary / Headings',
            family: 'Outfit',
            weights: '500, 600, 700, 900',
            usage: 'Dashboard figures, section titles, marketing headers'
        },
        {
            role: 'Secondary / UI / Data',
            family: 'Inter',
            weights: '400, 500',
            usage: 'Row data, forms, navigation, microcopy'
        },
        {
            role: 'Tertiary / Code',
            family: 'JetBrains Mono',
            weights: '400',
            usage: 'Transaction IDs, encryption keys, raw JSON exports'
        }
    ];

    // ── Layout Rules ──────────────────────────────────────────────────────

    readonly layoutRules: Array<ILayoutRule> = [
        { name: 'Grid & Spacing', detail: 'Strict 4px / 8px baseline grid. No arbitrary spacing.' },
        {
            name: 'Data Density',
            detail: 'Table rows: 24px–32px. Minimize padding. Maximize visible data.'
        },
        {
            name: 'Border Radius',
            detail: 'Max 4px (rounded-sm). No pill buttons. No excessive rounding.'
        },
        { name: 'Shadows', detail: 'Minimal. Prefer border-based elevation over box-shadow.' },
        {
            name: 'Animation Speed',
            detail: 'All hover/color transitions < 100ms. Use CSS transition: 80ms ease-out.'
        },
        {
            name: 'Keyboard Navigation',
            detail: 'CMD+K palette, Arrow keys for rows, Enter to edit, Escape to cancel.'
        }
    ];

    // ── Accessibility Rules ───────────────────────────────────────────────

    readonly a11yRules: Array<ILayoutRule> = [
        {
            name: 'Color Independence',
            detail: 'Never rely on color alone. Positive numbers get + prefix. Negative numbers get − or parentheses.'
        },
        {
            name: 'Contrast Ratios',
            detail: 'WCAG 2.1 AA minimum: 4.5:1 normal text, 3:1 large text. Verify in both themes.'
        },
        {
            name: 'Focus Rings',
            detail: 'Mandatory: 2px solid #8B5CF6 offset outline on all focusable elements. Never outline: none.'
        },
        {
            name: 'ARIA Labels',
            detail: 'All icon-only buttons require aria-label. Tables must have role, aria-sort, and column headers.'
        },
        {
            name: 'Reduced Motion',
            detail: 'Respect prefers-reduced-motion: reduce. Disable all non-essential animations.'
        },
        {
            name: 'Minimum Font Size',
            detail: '13px for data tables. 14px for form labels and UI text.'
        }
    ];
}
