import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAccount, ITransaction } from '@core';
import { KnownCategory, Money, TransactionStatus } from '@core';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Inline Fast Transaction Capture Widget for the Dashboard overview.
 */
@Component({
    selector: 'quick-entry-widget',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './quick-entry-widget.component.html',
    styleUrl: './quick-entry-widget.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickEntryWidgetComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);

    readonly accounts = this.ledgerStore.accounts;
    readonly payees = this.ledgerStore.payees;

    // Form fields
    readonly selectedAccountId = signal<string>('');
    readonly payee = signal<string>('');
    readonly category = signal<string>('');
    readonly amountString = signal<string>('');
    readonly isExpense = signal<boolean>(true);
    readonly date = signal<string>(new Date().toISOString().split('T')[0] ?? '');

    readonly isSubmitting = signal<boolean>(false);
    readonly showSuccess = signal<boolean>(false);
    readonly errorMessage = signal<string | null>(null);

    readonly activeAccounts = computed((): Array<IAccount> => {
        return this.accounts().filter((a: IAccount): boolean => a.isActive);
    });

    constructor() {
        // Auto-select first account if available
        const first = this.accounts()[0];
        if (first) {
            this.selectedAccountId.set(first.id);
        }
    }

    toggleType(): void {
        this.isExpense.update((v: boolean) => !v);
    }

    async saveTransaction(): Promise<void> {
        this.errorMessage.set(null);

        const firstActive = this.activeAccounts()[0];
        const accountId = this.selectedAccountId() || (firstActive ? firstActive.id : '');
        if (!accountId) {
            this.errorMessage.set('Please select an account.');
            return;
        }

        const payeeName = this.payee().trim();
        if (!payeeName) {
            this.errorMessage.set('Please enter a payee.');
            return;
        }

        const amountCents = Money.parseCurrencyInput(this.amountString());
        if (amountCents === 0) {
            this.errorMessage.set('Please enter a valid non-zero amount.');
            return;
        }

        const finalAmount = this.isExpense() ? -Math.abs(amountCents) : Math.abs(amountCents);
        const todayStr = new Date().toISOString().split('T')[0] ?? '';
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const matchedPayee = this.payees().find(
            p => p.name.toLowerCase() === payeeName.toLowerCase()
        );
        const payeeId = matchedPayee ? matchedPayee.id : `payee-${Date.now()}`;

        const newTx: ITransaction = {
            id: txId,
            accountId,
            payeeId,
            date: this.date() || todayStr,
            payee: payeeName,
            memo: this.category().trim(),
            totalAmount: finalAmount,
            status: TransactionStatus.Cleared,
            checkNumber: null,
            importHash: `quick-${txId}`,
            splits: [
                {
                    id: `split-${txId}-1`,
                    amount: finalAmount,
                    memo: this.category().trim(),
                    categoryId: KnownCategory.Uncategorized
                }
            ],
            createdAt: now,
            updatedAt: now
        };

        this.isSubmitting.set(true);
        try {
            await this.ledgerStore.addTransaction(newTx);
            this.payee.set('');
            this.amountString.set('');
            this.category.set('');
            this.showSuccess.set(true);
            setTimeout(() => this.showSuccess.set(false), 2500);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save transaction';
            this.errorMessage.set(msg);
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
