import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAccount, ITransaction } from '@core';
import { KnownCategory, Money, TransactionStatus } from '@core';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Animated Fast Transaction Capture Popup Modal for the Dashboard and Portfolio.
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

    readonly visible = model<boolean>(true);
    readonly preselectedAccountId = input<string | null>(null);
    readonly closed = output();

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

    readonly selectedAccount = computed((): IAccount | undefined => {
        const id = this.selectedAccountId();
        return this.accounts().find((a: IAccount): boolean => a.id === id);
    });

    constructor() {
        // Auto-select initial account or react to preselectedAccountId input
        effect(() => {
            const preselected = this.preselectedAccountId();
            if (preselected) {
                this.selectedAccountId.set(preselected);
            } else if (!this.selectedAccountId()) {
                const first = this.accounts()[0];
                if (first) {
                    this.selectedAccountId.set(first.id);
                }
            }
        });
    }

    toggleType(): void {
        this.isExpense.update((v: boolean) => !v);
    }

    close(): void {
        this.visible.set(false);
        this.closed.emit();
        this.errorMessage.set(null);
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.close();
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.close();
        }
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
            setTimeout(() => {
                this.showSuccess.set(false);
                this.close();
            }, 1000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save transaction';
            this.errorMessage.set(msg);
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
