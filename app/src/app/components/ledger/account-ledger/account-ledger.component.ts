import { CommonModule } from '@angular/common';
import type { ElementRef, OnInit } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ISODateString, ISplit, ITransaction } from '@core';
import { AccountType, KnownCategory, Money, TransactionStatus } from '@core';
import {
    Banknote,
    Calendar,
    CreditCard,
    Landmark,
    LucideAngularModule,
    Plus,
    Search,
    Wallet
} from 'lucide-angular';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncIndicatorComponent } from '../../sync/sync-indicator/sync-indicator.component';
import { TransactionTableComponent } from '../transaction-table/transaction-table.component';

@Component({
    selector: 'account-ledger',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        LucideAngularModule,
        TransactionTableComponent,
        SyncIndicatorComponent
    ],
    templateUrl: './account-ledger.component.html',
    styleUrls: ['./account-ledger.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountLedgerComponent implements OnInit {
    private readonly ledgerStore = inject(LedgerStore);

    // Inputs
    readonly initialAccountId = input<string | null>(null);

    // State
    readonly activeAccountId = signal<string | null>(null);
    readonly isImporting = signal<boolean>(false);

    // Quick Add Form
    readonly entryPayee = signal<string>('');
    readonly entryAmount = signal<string>('');
    readonly entryDate = signal<string>(new Date().toISOString().split('T')[0] ?? '');
    readonly entryMemo = signal<string>('');
    readonly manualSplits = signal<Array<ISplit>>(new Array<ISplit>());

    // Temp for Template
    readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    // Computed
    readonly accounts = this.ledgerStore.accounts;
    readonly transactions = this.ledgerStore.transactions;

    readonly filteredTransactions = computed(() => {
        const accId = this.activeAccountId();
        const allTxs = this.transactions();
        if (!accId) return allTxs;
        return allTxs.filter(tx => tx.accountId === accId);
    });

    readonly clearedBalance = computed(() => {
        return this.filteredTransactions()
            .filter(tx => tx.status === TransactionStatus.Cleared)
            .reduce((sum, tx) => sum + tx.totalAmount, 0);
    });

    readonly pendingBalance = computed(() => {
        return this.filteredTransactions()
            .filter(tx => tx.status === TransactionStatus.Pending)
            .reduce((sum, tx) => sum + tx.totalAmount, 0);
    });

    ngOnInit(): void {
        this.activeAccountId.set(this.initialAccountId());
    }

    async handleQuickAdd(): Promise<void> {
        const payee = this.entryPayee();
        const amountStr = this.entryAmount();
        if (!payee || !amountStr) return;

        const amountCents = Money.dollarsToCents(parseFloat(amountStr));
        const now = new Date().toISOString();

        // In a real app, getOrCreatePayee would be called via store/service
        // For now, mirroring the logic but we need to ensure the store supports it

        const tx: ITransaction = {
            id: `tx-${Date.now()}`,
            accountId: this.activeAccountId() ?? 'default',
            payeeId: 'manual', // Simplified for now
            date: this.entryDate() as ISODateString,
            payee: payee,
            memo: this.entryMemo(),
            totalAmount: amountCents,
            status: TransactionStatus.Cleared,
            checkNumber: null,
            importHash: `manual-${Date.now()}`,
            splits:
                this.manualSplits().length > 0
                    ? this.manualSplits()
                    : new Array<ISplit>({
                          id: `split-${Date.now()}`,
                          amount: amountCents,
                          memo: this.entryMemo(),
                          categoryId: KnownCategory.Uncategorized
                      }),
            createdAt: now as ISODateString,
            updatedAt: now as ISODateString
        };

        await this.ledgerStore.addTransaction(tx);

        // Reset form
        this.entryPayee.set('');
        this.entryAmount.set('');
        this.entryMemo.set('');
        this.manualSplits.set(new Array<ISplit>());
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAccountIcon(type: AccountType): any {
        switch (type) {
            case AccountType.Checking:
                return Landmark;
            case AccountType.Savings:
                return Banknote;
            case AccountType.Credit:
                return CreditCard;
            case AccountType.Cash:
                return Wallet;
            default:
                return Landmark;
        }
    }

    triggerImport(): void {
        this.fileInput()?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.isImporting.set(true);
        // Reconciliation logic would go here, omitting for base port
        // In Angular, we'll likely move QIF parsing to a service
        setTimeout(() => this.isImporting.set(false), 2000);
    }

    getAccountBalance(accId: string): number {
        return this.transactions()
            .filter(t => t.accountId === accId)
            .reduce((s, t) => s + t.totalAmount, 0);
    }

    // Lucide Icons
    readonly Landmark = Landmark;
    readonly Banknote = Banknote;
    readonly CreditCard = CreditCard;
    readonly Wallet = Wallet;
    readonly Plus = Plus;
    readonly Search = Search;
    readonly Calendar = Calendar;
}
