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

import type { IReconciliationMatch } from '@core';
import { QIFParser } from '../../../core/parsers/QIFParser';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SyncIndicatorComponent } from '../../sync/sync-indicator/sync-indicator.component';
import { ReconciliationDialogComponent } from '../reconciliation-dialog/reconciliation-dialog.component';
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
        SyncIndicatorComponent,
        ReconciliationDialogComponent
    ],
    templateUrl: './account-ledger.component.html',
    styleUrls: ['./account-ledger.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountLedgerComponent implements OnInit {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly posthogService = inject(PostHogService);

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

    // Reconciliation Dialog
    readonly reconciliationOpen = signal<boolean>(false);
    readonly reconciliationMatches = signal<Array<IReconciliationMatch>>([]);

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
        this.posthogService.posthog.capture('transaction_added', {
            account_id: this.activeAccountId(),
            is_split: this.manualSplits().length > 0,
            amount_cents: amountCents
        });

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

        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>): Promise<void> => {
            try {
                const content = e.target?.result as string;
                const parser = new QIFParser();
                const parseResult = parser.parse(content);

                if (parseResult.errors.length > 0) {
                    console.warn('[Import] Parse errors:', parseResult.errors);
                }

                const accountId = this.activeAccountId() ?? 'default';
                const matches = await this.ledgerStore.reconcileTransactions(
                    parseResult.transactions,
                    accountId
                );

                this.reconciliationMatches.set(matches);
                this.reconciliationOpen.set(true);

                this.posthogService.posthog.capture('qif_import_parsed', {
                    transaction_count: parseResult.transactions.length,
                    error_count: parseResult.errors.length,
                    account_type: parseResult.accountType
                });
            } catch (err) {
                console.error('[Import] Failed to parse QIF file:', err);
            } finally {
                this.isImporting.set(false);
                // Reset the file input so the same file can be re-imported if needed
                if (input) input.value = '';
            }
        };

        reader.onerror = (): void => {
            console.error('[Import] FileReader error');
            this.isImporting.set(false);
        };

        reader.readAsText(file);
    }

    async handleReconciliationConfirmed(
        decisions: Record<number, 'import' | 'match' | 'ignore'>
    ): Promise<void> {
        const matches = this.reconciliationMatches();
        const accountId = this.activeAccountId() ?? 'default';
        const now = new Date().toISOString();
        const txsToImport: Array<ITransaction> = [];

        for (const [idxStr, decision] of Object.entries(decisions)) {
            const idx = parseInt(idxStr, 10);
            const match = matches[idx];
            if (!match) continue;

            if (decision === 'import') {
                const parsed = match.parsedTx;
                // Get or create payee
                const payee = await this.ledgerStore.getOrCreatePayee(parsed.payee);

                const tx: ITransaction = {
                    id: `tx-import-${Date.now()}-${idx}`,
                    accountId,
                    payeeId: payee.id,
                    date: parsed.date,
                    payee: parsed.payee,
                    memo: parsed.memo,
                    totalAmount: parsed.amount,
                    status: TransactionStatus.Cleared,
                    checkNumber: parsed.checkNumber,
                    importHash: parsed.importHash,
                    splits: [
                        {
                            id: `split-import-${Date.now()}-${idx}`,
                            amount: parsed.amount,
                            memo: parsed.memo,
                            categoryId: KnownCategory.Uncategorized
                        }
                    ],
                    createdAt: now as ISODateString,
                    updatedAt: now as ISODateString
                };
                txsToImport.push(tx);
            } else if (decision === 'match' && match.existingTxId) {
                // Mark matched transaction as Cleared
                const existingTx = this.transactions().find(t => t.id === match.existingTxId);
                if (existingTx) {
                    await this.ledgerStore.updateTransaction({
                        ...existingTx,
                        status: TransactionStatus.Cleared,
                        updatedAt: now as ISODateString
                    });
                }
            }
            // 'ignore' — do nothing
        }

        if (txsToImport.length > 0) {
            await this.ledgerStore.addTransactions(txsToImport);
        }

        this.posthogService.posthog.capture('qif_import_completed', {
            imported_count: txsToImport.length,
            total_decisions: Object.keys(decisions).length
        });
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
