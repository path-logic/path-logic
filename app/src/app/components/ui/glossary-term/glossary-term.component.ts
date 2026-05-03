import {
    ChangeDetectionStrategy,
    Component,
    computed,
    HostListener,
    input,
    signal
} from '@angular/core';

/**
 * Pre-defined glossary entries from the brand guide.
 * Key = the canonical term (case-insensitive lookup).
 */
const GLOSSARY: Record<string, string> = {
    'aes-gcm 256': 'Military-grade encryption — your data is scrambled so only you can read it.',
    'aes-gcm': 'Military-grade encryption — your data is scrambled so only you can read it.',
    'zero-knowledge':
        "We can't see your data, even if we wanted to. Only your device holds the key.",
    reconciliation:
        "Matching your records against your bank statement to make sure nothing's missing.",
    reconcile: "Matching your records against your bank statement to make sure nothing's missing.",
    'split transaction':
        'One payment that covers multiple categories — like a paycheck split into salary, taxes, and insurance.',
    byos: 'Bring Your Own Storage — your data lives in your Google Drive or iCloud, not on our servers.',
    ledger: 'Your transaction log — every dollar in and out, organized by account.',
    'wasm sqlite': 'A full database running privately inside your browser — no server needed.',
    'cashflow projection':
        'A 90-day forecast of your balance based on your recurring bills and income.'
};

/**
 * GlossaryTermComponent — wraps technical terms with an accessible tooltip.
 *
 * ## Usage
 * ```html
 * <glossary-term term="AES-GCM 256" />
 * <!-- or with custom label: -->
 * <glossary-term term="Reconciliation">mark as reconciled</glossary-term>
 * ```
 *
 * ## Behaviour
 * - Dotted underline + cursor: help indicates the term has a definition.
 * - Definition appears on hover (desktop) or focus (keyboard / screen reader).
 * - Escape key closes the tooltip.
 * - Falls back gracefully if the term is not in the glossary (no underline).
 */
@Component({
    selector: 'glossary-term',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span
            class="glossary-host"
            [class.glossary-known]="definition()"
            [attr.tabindex]="definition() ? 0 : null"
            [attr.role]="definition() ? 'button' : null"
            [attr.aria-label]="definition() ? term() + ': ' + definition() : null"
            (mouseenter)="show()"
            (mouseleave)="hide()"
            (focus)="show()"
            (blur)="hide()"
        >
            <ng-content>{{ term() }}</ng-content>

            @if (isVisible() && definition()) {
                <span class="glossary-tooltip" role="tooltip">
                    {{ definition() }}
                </span>
            }
        </span>
    `,
    styles: `
        .glossary-host {
            position: relative;
            display: inline;
        }

        /* Only apply the dotted underline if we have a known definition */
        .glossary-known {
            border-bottom: 1px dotted var(--pl-text-muted);
            cursor: help;
        }

        .glossary-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            z-index: 9998;

            width: max-content;
            max-width: 260px;

            padding: 8px 12px;
            border-radius: 6px;
            background: var(--pl-bg-elevated);
            border: 1px solid var(--pl-border-subtle);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

            font-family: 'Inter', 'Outfit', sans-serif;
            font-size: 0.72rem;
            font-weight: 400;
            line-height: 1.5;
            color: var(--pl-text-primary);
            text-align: left;
            white-space: normal;
            cursor: default;

            animation: tooltipIn 0.12s ease-out both;
        }

        /* Small triangle pointer */
        .glossary-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: var(--pl-border-subtle);
        }

        @keyframes tooltipIn {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(4px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `
})
export class GlossaryTermComponent {
    /** The canonical term to look up and display (if no ng-content is provided). */
    readonly term = input.required<string>();

    readonly isVisible = signal(false);

    readonly definition = computed((): string | null => {
        const key = this.term().toLowerCase().trim();
        return GLOSSARY[key] ?? null;
    });

    @HostListener('keydown.escape')
    onEscape(): void {
        this.hide();
    }

    show(): void {
        if (this.definition()) this.isVisible.set(true);
    }

    hide(): void {
        this.isVisible.set(false);
    }
}
