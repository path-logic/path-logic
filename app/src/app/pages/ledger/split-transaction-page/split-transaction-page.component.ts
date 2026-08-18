import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { Cents, ISODateString, ISplit, ITransaction } from '@core';
import { Money } from '@core';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Dedicated full-page split transaction editor designed for mobile and touch devices.
 * Provides unconstrained vertical scrolling, penny-perfect sum calculation,
 * negative deduction toggling, category mapping, and 44px minimum touch targets.
 */
@Component({
    selector: 'split-transaction-page',
    standalone: true,
    imports: [CommonModule, FormsModule, AppShellComponent],
    templateUrl: './split-transaction-page.component.html',
    styleUrls: ['./split-transaction-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplitTransactionPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly ledgerStore = inject(LedgerStore);

    // Route parameters
    readonly accountId = signal<string>(this.route.snapshot.paramMap.get('accountId') || '');
    readonly transactionId = signal<string>(
        this.route.snapshot.paramMap.get('transactionId') || ''
    );

    // Store Signals
    readonly categories = this.ledgerStore.categories;
    readonly transactions = this.ledgerStore.transactions;

    // Transaction & Splits State
    readonly transaction = computed<ITransaction | null>(() => {
        const txId = this.transactionId();
        if (!txId || txId === 'new') return null;
        return this.transactions().find(t => t.id === txId) || null;
    });

    readonly totalAmount = signal<number>(0);
    readonly splits = signal<Array<ISplit>>([]);
    readonly payeeName = signal<string>('');
    readonly transactionDate = signal<string>('');

    // Computed Balancing State
    readonly sumSplits = computed(() => {
        return this.splits().reduce((sum, s) => sum + s.amount, 0);
    });

    readonly remainingAmount = computed(() => {
        return this.totalAmount() - this.sumSplits();
    });

    readonly isBalanced = computed(() => {
        return this.remainingAmount() === 0;
    });

    readonly isValid = computed(() => {
        return (
            this.isBalanced() &&
            this.splits().length >= 2 &&
            this.splits().every(s => s.categoryId && s.categoryId.trim().length > 0)
        );
    });

    constructor() {
        const tx = this.transaction();
        if (tx) {
            this.totalAmount.set(tx.totalAmount);
            this.payeeName.set(tx.payee);
            this.transactionDate.set(tx.date);
            if (tx.splits && tx.splits.length > 0) {
                this.splits.set(tx.splits.map(s => ({ ...s })));
            } else {
                this.splits.set([
                    {
                        id: `split-${Date.now()}-1`,
                        amount: tx.totalAmount,
                        categoryId: '',
                        memo: tx.memo || ''
                    },
                    {
                        id: `split-${Date.now()}-2`,
                        amount: 0 as Cents,
                        categoryId: '',
                        memo: ''
                    }
                ]);
            }
        } else {
            // Fallback for new / untracked transaction
            this.splits.set([
                {
                    id: `split-${Date.now()}-1`,
                    amount: 0 as Cents,
                    categoryId: '',
                    memo: ''
                },
                {
                    id: `split-${Date.now()}-2`,
                    amount: 0 as Cents,
                    categoryId: '',
                    memo: ''
                }
            ]);
        }
    }

    // Amount Formatter helpers
    formatCurrency(cents: number): string {
        return Money.formatCurrency(cents as Cents);
    }

    getDollars(cents: number): string {
        const abs = Math.abs(cents);
        return (abs / 100).toFixed(2);
    }

    // Split Line Actions
    updateSplitAmount(index: number, newAmountCents: number): void {
        this.splits.update(current => {
            const copy = [...current];
            const item = copy[index];
            if (item) {
                copy[index] = { ...item, amount: newAmountCents as Cents };
            }
            return copy;
        });
    }

    onSplitAmountInputChange(index: number, rawValue: string): void {
        const parsed = parseFloat(rawValue.replace(/,/g, ''));
        const currentSplit = this.splits()[index];
        const isNegative = currentSplit ? currentSplit.amount < 0 : false;
        const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100);
        const signedCents = isNegative ? -Math.abs(cents) : Math.abs(cents);
        this.updateSplitAmount(index, signedCents);
    }

    updateSplitCategory(index: number, categoryId: string): void {
        this.splits.update(current => {
            const copy = [...current];
            const item = copy[index];
            if (item) {
                copy[index] = { ...item, categoryId };
            }
            return copy;
        });
    }

    updateSplitMemo(index: number, memo: string): void {
        this.splits.update(current => {
            const copy = [...current];
            const item = copy[index];
            if (item) {
                copy[index] = { ...item, memo };
            }
            return copy;
        });
    }

    toggleSplitSign(index: number): void {
        this.splits.update(current => {
            const copy = [...current];
            const item = copy[index];
            if (item) {
                copy[index] = { ...item, amount: -item.amount as Cents };
            }
            return copy;
        });
    }

    addSplit(): void {
        const defaultCat = this.categories()[0]?.id || '';
        const remainder = this.remainingAmount();
        this.splits.update(current => [
            ...current,
            {
                id: `split-${Date.now()}-${current.length + 1}`,
                amount: (remainder !== 0 ? remainder : 0) as Cents,
                categoryId: defaultCat,
                memo: ''
            }
        ]);
    }

    removeSplit(index: number): void {
        if (this.splits().length <= 1) return;
        this.splits.update(current => current.filter((_, i) => i !== index));
    }

    autoFillRemainder(): void {
        const diff = this.remainingAmount();
        if (diff === 0) return;

        const currentSplits = this.splits();
        if (currentSplits.length === 0) return;

        const lastIdx = currentSplits.length - 1;
        const lastItem = currentSplits[lastIdx];
        if (lastItem) {
            this.updateSplitAmount(lastIdx, lastItem.amount + diff);
        }
    }

    cancel(): void {
        const accId = this.accountId();
        if (accId) {
            void this.router.navigate(['/accounts', accId]);
        } else {
            void this.router.navigate(['/accounts']);
        }
    }

    async saveSplits(): Promise<void> {
        if (!this.isValid()) return;

        const tx = this.transaction();
        if (tx) {
            const updatedTx: ITransaction = {
                ...tx,
                splits: this.splits().map((s, i) => ({
                    ...s,
                    id: s.id || `split-${tx.id}-${i + 1}`
                })),
                updatedAt: new Date().toISOString() as ISODateString
            };
            await this.ledgerStore.updateTransaction(updatedTx);
        }

        this.cancel();
    }
}
