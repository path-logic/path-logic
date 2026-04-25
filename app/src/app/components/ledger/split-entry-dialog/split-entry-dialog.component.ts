import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal,
    untracked
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ISplit } from '@core';
import { KnownCategory, Money } from '@core';
import { Calculator, LucideAngularModule, Plus, Scale, Trash2, X } from 'lucide-angular';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';

/**
 * Dialog for editing split transactions.
 * Ensures penny-perfect balancing of splits against a total amount.
 */
@Component({
    selector: 'split-entry-dialog',
    standalone: true,
    imports: [FormsModule, LucideAngularModule, Dialog, Button, Select],
    templateUrl: './split-entry-dialog.component.html',
    styleUrls: ['./split-entry-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplitEntryDialogComponent {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly posthogService = inject(PostHogService);

    // Inputs
    readonly isOpen = model<boolean>(false);
    readonly totalAmount = input.required<number>(); // in cents
    readonly initialSplits = input<Array<ISplit>>(new Array<ISplit>());

    // Outputs
    readonly saved = output<{ splits: Array<ISplit>; newTotal?: number }>();

    // State
    readonly splits = signal<Array<ISplit>>(new Array<ISplit>());

    // Computed
    readonly categories = this.ledgerStore.categories;

    readonly sumSplits = computed(() => {
        return this.splits().reduce((sum, s) => sum + s.amount, 0);
    });

    readonly difference = computed(() => {
        return this.totalAmount() - this.sumSplits();
    });

    readonly isBalanced = computed(() => {
        return this.difference() === 0;
    });

    constructor() {
        // Sync initialSplits to splits signal when initialSplits changes
        effect(() => {
            const initial = this.initialSplits();
            const total = this.totalAmount();

            untracked(() => {
                this.splits.set([...initial]);

                // If empty, add a default balanced split
                if (this.splits().length === 0) {
                    this.splits.set([
                        {
                            id: `split-${Date.now()}`,
                            amount: total,
                            memo: '',
                            categoryId: KnownCategory.Uncategorized
                        }
                    ]);
                }
            });
        });
    }

    // Since we use signals, we can have a manual reset method
    reset(initial: Array<ISplit>): void {
        if (initial.length > 0) {
            this.splits.set([...initial]);
        } else {
            this.splits.set(
                new Array<ISplit>({
                    id: `split-${Date.now()}`,
                    amount: this.totalAmount(),
                    memo: '',
                    categoryId: KnownCategory.Uncategorized
                })
            );
        }
    }

    handleAddSplit(): void {
        this.splits.update(current => [
            ...current,
            {
                id: `split-${Date.now()}`,
                amount: 0,
                memo: '',
                categoryId: KnownCategory.Uncategorized
            }
        ]);
    }

    handleRemoveSplit(id: string): void {
        if (this.splits().length <= 1) return;
        this.splits.update(current => current.filter(s => s.id !== id));
    }

    handleUpdateSplit(id: string, updates: Partial<ISplit>): void {
        this.splits.update(current => current.map(s => (s.id === id ? { ...s, ...updates } : s)));
    }

    handleQuickBalance(): void {
        const currentSplits = this.splits();
        if (currentSplits.length === 0) return;
        const lastSplit = currentSplits[currentSplits.length - 1];
        if (!lastSplit) return;
        this.handleUpdateSplit(lastSplit.id, {
            amount: lastSplit.amount + this.difference()
        });
    }

    handleSave(): void {
        this.posthogService.posthog.capture('split_transaction_saved', {
            split_count: this.splits().length,
            is_balanced: this.isBalanced()
        });
        this.saved.emit({ splits: this.splits() });
        this.isOpen.set(false);
    }

    handleAdjustTotal(): void {
        this.posthogService.posthog.capture('split_transaction_saved', {
            split_count: this.splits().length,
            is_balanced: false,
            adjusted_total: true
        });
        this.saved.emit({ splits: this.splits(), newTotal: this.sumSplits() });
        this.isOpen.set(false);
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    dollarsToCents(dollars: number): number {
        return Money.dollarsToCents(dollars);
    }

    centsToDollars(cents: number): number {
        return Money.centsToDollars(cents);
    }

    onClose(): void {
        this.isOpen.set(false);
    }

    // Lucide Icons
    readonly Calculator = Calculator;
    readonly Plus = Plus;
    readonly Scale = Scale;
    readonly Trash2 = Trash2;
    readonly X = X;
}
