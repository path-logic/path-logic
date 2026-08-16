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
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import type { ICategory, IPayee, ISODateString, ISplit, ITransaction } from '../../../core';
import { Money, TransactionStatus, type Cents } from '../../../core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeAutocompleteComponent } from '../../payees/payee-autocomplete/payee-autocomplete.component';
import { SplitEntryDialogComponent } from '../split-entry-dialog/split-entry-dialog.component';

export type EntryMode = 'expense' | 'deposit' | 'transfer';

@Component({
    selector: 'app-mobile-transaction-entry-sheet',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        AutoCompleteModule,
        PayeeAutocompleteComponent,
        SplitEntryDialogComponent
    ],
    templateUrl: './mobile-transaction-entry-sheet.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileTransactionEntrySheetComponent {
    /** Two-way Signal model for sheet visibility */
    readonly visible = model<boolean>(false);

    /** Target account ID */
    readonly accountId = input.required<string>();

    /** Optional transaction to edit (null for new transaction) */
    readonly transaction = input<ITransaction | null>(null);

    /** Emitted when transaction is created or updated */
    readonly saved = output<ITransaction>();

    private readonly ledgerStore = inject(LedgerStore);

    // State signals
    readonly mode = signal<EntryMode>('expense');
    readonly amountString = signal<string>('0.00');
    readonly selectedPayee = signal<IPayee | null>(null);
    readonly selectedCategory = signal<ICategory | null>(null);
    readonly transferToAccountId = signal<string>('');
    readonly entryDate = signal<string>(new Date().toISOString().split('T')[0] || '');
    readonly entryMemo = signal<string>('');
    readonly manualSplits = signal<Array<ISplit>>([]);
    readonly isSplitDialogOpen = signal<boolean>(false);

    // Context from store
    readonly accounts = this.ledgerStore.accounts;
    readonly payees = this.ledgerStore.payees;
    readonly categories = this.ledgerStore.categories;

    // Filtered categories for autocomplete
    readonly filteredCategories = signal<Array<ICategory>>([]);

    readonly amountCents = computed<number>(() => {
        const raw = this.amountString();
        const num = parseFloat(raw.replace(/,/g, ''));
        if (isNaN(num) || num <= 0) return 0;
        return Money.dollarsToCents(num);
    });

    readonly formattedHeroAmount = computed<string>(() => {
        const str = this.amountString();
        if (str === '0.00' || str === '0' || str === '') return '$0.00';
        return `$${str}`;
    });

    constructor() {
        // Synchronize when an existing transaction is passed for editing
        effect(() => {
            const tx = this.transaction();
            if (tx) {
                const isExpense = tx.totalAmount < 0;
                this.mode.set(isExpense ? 'expense' : 'deposit');
                const dollars = Math.abs(Money.centsToDollars(tx.totalAmount));
                this.amountString.set(dollars.toFixed(2));
                this.entryDate.set(tx.date.split('T')[0] || '');
                this.entryMemo.set(tx.memo || '');

                if (tx.splits && tx.splits.length > 1) {
                    this.manualSplits.set(tx.splits);
                    this.selectedCategory.set(null);
                } else if (tx.splits && tx.splits[0]) {
                    this.manualSplits.set([]);
                    const cat = this.categories().find(c => c.id === tx.splits[0]?.categoryId);
                    this.selectedCategory.set(cat || null);
                }

                if (tx.payeeId) {
                    const p = this.payees().find(payee => payee.id === tx.payeeId);
                    this.selectedPayee.set(p || null);
                }
            }
        });
    }

    setMode(mode: EntryMode): void {
        this.mode.set(mode);
    }

    onKeypadPress(val: string): void {
        const current = this.amountString();
        if (current === '0.00' || current === '0') {
            if (val === '.') {
                this.amountString.set('0.');
            } else {
                this.amountString.set(val);
            }
            return;
        }

        if (val === '.') {
            if (current.includes('.')) return;
            this.amountString.set(current + '.');
            return;
        }

        // Limit decimal places to 2
        if (current.includes('.')) {
            const parts = current.split('.');
            if (parts[1] && parts[1].length >= 2) return;
        }

        this.amountString.set(current + val);
    }

    onKeypadBackspace(): void {
        const current = this.amountString();
        if (current.length <= 1 || current === '0.00') {
            this.amountString.set('0.00');
            return;
        }
        this.amountString.set(current.slice(0, -1));
    }

    onKeypadClear(): void {
        this.amountString.set('0.00');
    }

    onPayeeSelected(payee: IPayee | null): void {
        this.selectedPayee.set(payee);
        if (payee?.defaultCategoryId && !this.selectedCategory()) {
            const cat = this.categories().find(c => c.id === payee.defaultCategoryId);
            if (cat) {
                this.selectedCategory.set(cat);
            }
        }
    }

    filterCategories(event: { query: string }): void {
        const q = (event.query || '').toLowerCase().trim();
        if (!q) {
            this.filteredCategories.set(this.categories());
            return;
        }
        this.filteredCategories.set(
            this.categories().filter(c => c.name.toLowerCase().includes(q))
        );
    }

    openSplitDialog(): void {
        this.isSplitDialogOpen.set(true);
    }

    handleSplitsSaved(event: { splits: Array<ISplit>; newTotal?: number }): void {
        this.manualSplits.set(event.splits);
        if (event.newTotal !== undefined) {
            this.amountString.set(Money.centsToDollars(event.newTotal).toFixed(2));
        }
        this.isSplitDialogOpen.set(false);
    }

    isFormValid(): boolean {
        const cents = this.amountCents();
        if (cents <= 0) return false;

        if (this.mode() === 'transfer') {
            return !!this.transferToAccountId() && this.transferToAccountId() !== this.accountId();
        }

        // For expense/deposit, need at least payee or category or splits
        return (
            !!this.selectedPayee() || !!this.selectedCategory() || this.manualSplits().length > 0
        );
    }

    async save(): Promise<void> {
        if (!this.isFormValid()) return;

        const cents = this.amountCents();
        const multiplier = this.mode() === 'expense' ? -1 : 1;
        const totalAmount = (cents * multiplier) as Cents;

        const existing = this.transaction();
        const now = new Date().toISOString() as ISODateString;
        const newTxId = existing ? existing.id : `tx-${Date.now()}`;

        const splits: Array<ISplit> =
            this.manualSplits().length > 0
                ? this.manualSplits().map((s, idx) => ({
                      ...s,
                      id: s.id || `split-${newTxId}-${idx}`,
                      memo: s.memo || ''
                  }))
                : [
                      {
                          id:
                              existing && existing.splits.length > 0
                                  ? existing.splits[0]?.id || `split-${newTxId}`
                                  : `split-${newTxId}`,
                          amount: totalAmount,
                          categoryId: this.selectedCategory()?.id || null,
                          memo: this.entryMemo() || ''
                      }
                  ];

        const payeeName =
            this.selectedPayee()?.name ||
            (this.mode() === 'transfer' ? 'Transfer' : 'Unspecified Payee');

        const tx: ITransaction = {
            id: newTxId,
            accountId: this.accountId(),
            date: (this.entryDate() || now.split('T')[0]) as ISODateString,
            payee: payeeName,
            payeeId: this.selectedPayee()?.id || 'payee-generic',
            memo: this.entryMemo() || '',
            totalAmount,
            status: existing ? existing.status : TransactionStatus.Cleared,
            splits,
            checkNumber: null,
            importHash: existing ? existing.importHash : `manual-${newTxId}`,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now
        };

        if (existing) {
            await this.ledgerStore.updateTransaction(tx);
        } else {
            await this.ledgerStore.applyReconciliationBatch([], [tx], []);
        }

        this.saved.emit(tx);
        this.close();
    }

    async deleteTransaction(): Promise<void> {
        const tx = this.transaction();
        if (!tx) return;
        await this.ledgerStore.removeTransaction(tx.id);
        this.close();
    }

    close(): void {
        this.visible.set(false);
        this.reset();
    }

    private reset(): void {
        this.amountString.set('0.00');
        this.selectedPayee.set(null);
        this.selectedCategory.set(null);
        this.entryMemo.set('');
        this.manualSplits.set([]);
        this.transferToAccountId.set('');
    }
}
