import { CommonModule } from '@angular/common';
import type { ElementRef, OnDestroy, OnInit } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    computed,
    effect,
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
    Upload,
    Wallet
} from 'lucide-angular';
import { MessageService } from 'primeng/api';

import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import type { ReconciliationDecision } from '../../../services/import/import.types';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SyncIndicatorComponent } from '../../sync/sync-indicator/sync-indicator.component';
import { ImportProgressOverlayComponent } from '../import-progress-overlay/import-progress-overlay.component';
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
        ReconciliationDialogComponent,
        ImportProgressOverlayComponent
    ],
    providers: [MessageService],
    templateUrl: './account-ledger.component.html',
    styleUrls: ['./account-ledger.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountLedgerComponent implements OnInit, OnDestroy {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly posthogService = inject(PostHogService);
    readonly importService = inject(ImportOrchestrationService);
    private readonly messageService = inject(MessageService);

    // Inputs
    readonly initialAccountId = input<string | null>(null);

    // State
    readonly activeAccountId = signal<string | null>(null);

    // Quick Add Form
    readonly entryPayee = signal<string>('');
    readonly entryAmount = signal<string>('');
    readonly entryDate = signal<string>(new Date().toISOString().split('T')[0] ?? '');
    readonly entryMemo = signal<string>('');
    readonly manualSplits = signal<Array<ISplit>>(new Array<ISplit>());

    // Reconciliation Dialog
    readonly reconciliationOpen = signal<boolean>(false);

    // Drag-and-drop state
    readonly isDragOver = signal<boolean>(false);

    // File input ref
    readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    // Computed from store
    readonly accounts = this.ledgerStore.accounts;
    readonly transactions = this.ledgerStore.transactions;

    readonly filteredTransactions = computed(() => {
        const accId = this.activeAccountId();
        const allTxs = this.transactions();
        if (!accId) return allTxs;
        return allTxs.filter(tx => tx.accountId === accId);
    });

    readonly clearedBalance = computed(() =>
        this.filteredTransactions()
            .filter(tx => tx.status === TransactionStatus.Cleared)
            .reduce((sum, tx) => sum + tx.totalAmount, 0)
    );

    readonly pendingBalance = computed(() =>
        this.filteredTransactions()
            .filter(tx => tx.status === TransactionStatus.Pending)
            .reduce((sum, tx) => sum + tx.totalAmount, 0)
    );

    /** Convenience alias so the template can read import progress reactively. */
    readonly importProgress = this.importService.progress;
    readonly importMatches = this.importService.matches;
    readonly importStats = this.importService.stats;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    constructor() {
        // Open the reconciliation dialog when import finishes
        effect(() => {
            const stage = this.importService.progress().stage;
            if (stage === 'done') {
                this.reconciliationOpen.set(true);
                this.posthogService.posthog.capture('qif_import_parsed', {
                    match_count: this.importService.matches().length,
                    account_id: this.activeAccountId()
                });
            }
        });
    }

    ngOnInit(): void {
        this.activeAccountId.set(this.initialAccountId());
    }

    ngOnDestroy(): void {
        this.importService.reset();
    }

    // ── Drag and Drop ─────────────────────────────────────────────────────────

    @HostListener('dragover', ['$event'])
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        const hasFiles = event.dataTransfer?.types.includes('Files') ?? false;
        if (hasFiles) this.isDragOver.set(true);
    }

    @HostListener('dragleave', ['$event'])
    onDragLeave(event: DragEvent): void {
        // Only clear if leaving the host element (not a child)
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const outside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;
        if (outside) this.isDragOver.set(false);
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver.set(false);

        const file = event.dataTransfer?.files[0];
        if (file && this.isQifFile(file)) {
            this.startImport(file);
        }
    }

    // ── Import actions ────────────────────────────────────────────────────────

    triggerImport(): void {
        this.fileInput()?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        input.value = ''; // reset so same file can be re-selected
        this.startImport(file);
    }

    private startImport(file: File): void {
        const accountId = this.activeAccountId() ?? 'default';
        this.importService.startImport(file, accountId);
    }

    private isQifFile(file: File): boolean {
        return (
            file.name.toLowerCase().endsWith('.qif') ||
            file.name.toLowerCase().endsWith('.csv') ||
            file.type === 'application/qif' ||
            file.type === 'text/plain'
        );
    }

    // ── Reconciliation commit ─────────────────────────────────────────────────

    async handleReconciliationConfirmed(
        decisions: Record<number, ReconciliationDecision>
    ): Promise<void> {
        const matches = this.importService.matches();
        const accountId = this.activeAccountId() ?? 'default';
        const now = new Date().toISOString();
        const txsToImport: Array<ITransaction> = [];
        let matchedCount = 0;
        let ignoredCount = 0;

        for (const [idxStr, decision] of Object.entries(decisions)) {
            const idx = parseInt(idxStr, 10);
            const match = matches[idx];
            if (!match) continue;

            if (decision === 'import') {
                const parsed = match.parsedTx;
                const payee = await this.ledgerStore.getOrCreatePayee(parsed.payee);

                txsToImport.push({
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
                });
            } else if (decision === 'match' && match.existingTxId) {
                const existingTx = this.transactions().find(t => t.id === match.existingTxId);
                if (existingTx) {
                    await this.ledgerStore.updateTransaction({
                        ...existingTx,
                        status: TransactionStatus.Cleared,
                        updatedAt: now as ISODateString
                    });
                    matchedCount++;
                }
            } else {
                ignoredCount++;
            }
        }

        if (txsToImport.length > 0) {
            await this.ledgerStore.addTransactions(txsToImport);
        }

        // Show completion toast
        this.messageService.add({
            severity: 'success',
            summary: 'Import Complete',
            detail: [
                txsToImport.length > 0 ? `${txsToImport.length.toLocaleString()} added` : '',
                matchedCount > 0 ? `${matchedCount} matched` : '',
                ignoredCount > 0 ? `${ignoredCount} skipped` : ''
            ]
                .filter(Boolean)
                .join(' · '),
            life: 5000
        });

        this.posthogService.posthog.capture('qif_import_completed', {
            imported_count: txsToImport.length,
            matched_count: matchedCount,
            ignored_count: ignoredCount
        });

        this.importService.reset();
    }

    handleImportCancelled(): void {
        this.importService.reset();
    }

    // ── Quick Add ─────────────────────────────────────────────────────────────

    async handleQuickAdd(): Promise<void> {
        const payee = this.entryPayee();
        const amountStr = this.entryAmount();
        if (!payee || !amountStr) return;

        const amountCents = Money.dollarsToCents(parseFloat(amountStr));
        const now = new Date().toISOString();

        const tx: ITransaction = {
            id: `tx-${Date.now()}`,
            accountId: this.activeAccountId() ?? 'default',
            payeeId: 'manual',
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

        this.entryPayee.set('');
        this.entryAmount.set('');
        this.entryMemo.set('');
        this.manualSplits.set(new Array<ISplit>());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    getAccountBalance(accId: string): number {
        return this.transactions()
            .filter(t => t.accountId === accId)
            .reduce((s, t) => s + t.totalAmount, 0);
    }

    // ── Icons ─────────────────────────────────────────────────────────────────

    readonly Landmark = Landmark;
    readonly Banknote = Banknote;
    readonly CreditCard = CreditCard;
    readonly Wallet = Wallet;
    readonly Plus = Plus;
    readonly Search = Search;
    readonly Calendar = Calendar;
    readonly Upload = Upload;
}
