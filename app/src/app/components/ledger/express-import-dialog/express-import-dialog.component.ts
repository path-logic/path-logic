import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    model,
    output,
    signal
} from '@angular/core';
import type { IReconciliationMatch } from '@core';
import { PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import type { IImportStats, ReconciliationDecision } from '../../../services/import/import.types';
import { PostHogService } from '../../../services/posthog/posthog.service';

@Component({
    selector: 'express-import-dialog',
    standalone: true,
    imports: [CommonModule, Dialog, Button, PrimeTemplate],
    templateUrl: './express-import-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpressImportDialogComponent {
    private readonly posthogService = inject(PostHogService);

    // ── Inputs ────────────────────────────────────────────────────────────────
    readonly isOpen = model<boolean>(false);
    readonly matches = input.required<Array<IReconciliationMatch>>();
    readonly importStats = input<IImportStats | null>(null);

    // ── Outputs ───────────────────────────────────────────────────────────────
    readonly confirmed = output<{
        decisions: Record<number, ReconciliationDecision>;
        done: () => void;
    }>();
    readonly reviewFirst = output();

    // ── State ─────────────────────────────────────────────────────────────────
    readonly isProcessing = signal<boolean>(false);

    // ── Actions ───────────────────────────────────────────────────────────────
    onReviewFirst(): void {
        this.reviewFirst.emit();
    }

    onClose(): void {
        this.isOpen.set(false);
    }

    async handleExpressImport(): Promise<void> {
        this.isProcessing.set(true);
        // Yield to paint
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const decisions: Record<number, ReconciliationDecision> = {};
            this.matches().forEach((match, idx) => {
                if (match.type === 'none') decisions[idx] = 'import';
                else if (match.type === 'exact') decisions[idx] = 'ignore';
            });

            const values = Object.values(decisions);
            this.posthogService.posthog.capture('reconciliation_completed', {
                total_matches: this.matches().length,
                imported_count: values.filter(d => d === 'import').length,
                matched_count: values.filter(d => d === 'match').length,
                ignored_count: values.filter(d => d === 'ignore').length,
                is_large_dataset: true,
                smart_defaults_used: true
            });

            this.confirmed.emit({
                decisions,
                done: () => {
                    this.isProcessing.set(false);
                    this.isOpen.set(false);
                }
            });
        } catch (err: unknown) {
            console.error('Failed to apply express import decisions', err);
            this.isProcessing.set(false);
        }
    }
}
