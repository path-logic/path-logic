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
    untracked,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { IPayee, ISODateString, ITransaction } from '@core';
import { AccountType, KnownCategory, Money, TransactionStatus } from '@core';
import { MessageService } from 'primeng/api';

import type { IAccount } from '@core';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import type { ReconciliationDecision } from '../../../services/import/import.types';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { NewAccountDialogComponent } from '../../onboarding/new-account-dialog/new-account-dialog.component';
import { SyncIndicatorComponent } from '../../sync/sync-indicator/sync-indicator.component';
import { AccountDropdownComponent } from '../account-dropdown/account-dropdown.component';
import { CategoryMappingDialogComponent } from '../category-mapping-dialog/category-mapping-dialog.component';
import { ExpressImportDialogComponent } from '../express-import-dialog/express-import-dialog.component';
import { ImportProgressOverlayComponent } from '../import-progress-overlay/import-progress-overlay.component';
import { MobileTransactionEntrySheetComponent } from '../mobile-transaction-entry-sheet/mobile-transaction-entry-sheet.component';
import { ReconciliationDialogComponent } from '../reconciliation-dialog/reconciliation-dialog.component';
import { TransactionEntryFormComponent } from '../transaction-entry-form/transaction-entry-form.component';
import { TransactionTableComponent } from '../transaction-table/transaction-table.component';

@Component({
    selector: 'account-ledger',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        AccountDropdownComponent,
        TransactionTableComponent,
        TransactionEntryFormComponent,
        MobileTransactionEntrySheetComponent,
        SyncIndicatorComponent,
        ReconciliationDialogComponent,
        ExpressImportDialogComponent,
        ImportProgressOverlayComponent,
        CategoryMappingDialogComponent,
        NewAccountDialogComponent
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
    readonly statusFilter = signal<'all' | 'cleared' | 'pending'>('all');
    readonly getAccountBalanceBound = (id: string): number => this.getAccountBalance(id);

    // Mobile Entry Sheet & Edit State
    readonly isMobileEntrySheetOpen = signal<boolean>(false);
    readonly editingTransaction = signal<ITransaction | null>(null);

    // New Account Dialog
    readonly isAddDialogOpen = signal<boolean>(false);

    // Reconciliation Dialog
    readonly reconciliationOpen = signal<boolean>(false);
    readonly expressImportOpen = signal<boolean>(false);

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
        const filter = this.statusFilter();
        let txs = accId ? allTxs.filter(tx => tx.accountId === accId) : allTxs;
        if (filter === 'cleared') {
            txs = txs.filter(
                tx =>
                    tx.status === TransactionStatus.Cleared ||
                    tx.status === TransactionStatus.Reconciled
            );
        } else if (filter === 'pending') {
            txs = txs.filter(tx => tx.status === TransactionStatus.Pending);
        }
        return txs;
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

    readonly activeAccount = computed(() => {
        const accs = this.accounts();
        const id = this.activeAccountId();
        if (!id && accs.length > 0) return accs[0];
        return accs.find(a => a.id === id) ?? null;
    });

    openReconciliation(): void {
        this.reconciliationOpen.set(true);
    }

    openNewTransactionMobile(): void {
        this.editingTransaction.set(null);
        this.isMobileEntrySheetOpen.set(true);
    }

    openEditTransactionMobile(tx: ITransaction): void {
        this.editingTransaction.set(tx);
        this.isMobileEntrySheetOpen.set(true);
    }

    setStatusFilter(filter: 'all' | 'cleared' | 'pending'): void {
        this.statusFilter.set(filter);
    }

    /** Convenience alias so the template can read import progress reactively. */
    readonly importProgress = this.importService.progress;
    readonly importMatches = this.importService.matches;
    readonly importStats = this.importService.stats;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    constructor() {
        // Open the appropriate dialog when import finishes
        effect(() => {
            const stage = this.importService.progress().stage;
            if (stage === 'done') {
                untracked(() => {
                    const matches = this.importService.matches();
                    const stats = this.importService.stats();
                    const isExpress = matches.length >= 100 && stats?.fuzzyCount === 0;

                    if (isExpress) {
                        this.expressImportOpen.set(true);
                    } else {
                        this.reconciliationOpen.set(true);
                    }

                    this.posthogService.posthog.capture('qif_import_parsed', {
                        match_count: matches.length,
                        account_id: this.activeAccountId()
                    });
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

    handleAccountCreated(account: IAccount): void {
        this.ledgerStore.addAccount(account);
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

    async handleReconciliationConfirmed(event: {
        decisions: Record<number, ReconciliationDecision>;
        payeeOverrides?: Record<number, string>;
        categoryOverrides?: Record<number, string>;
        matchOverrides?: Record<number, string>;
        done: () => void;
    }): Promise<void> {
        const {
            decisions,
            payeeOverrides = {},
            categoryOverrides = {},
            matchOverrides = {},
            done
        } = event;
        const matches = this.importService.matches();
        const accountId = this.activeAccountId() ?? 'default';
        const now = new Date().toISOString() as ISODateString;

        const txsToImport: Array<ITransaction> = [];
        const txsToUpdate: Array<ITransaction> = [];
        const newPayees = new Map<string, IPayee>();
        const currentPayees = new Map(this.ledgerStore.payees().map(p => [p.name, p]));

        let matchedCount = 0;
        let ignoredCount = 0;

        for (const [idxStr, decision] of Object.entries(decisions)) {
            const idx = parseInt(idxStr, 10);
            const match = matches[idx];
            if (!match) continue;

            if (decision === 'import') {
                const parsed = match.parsedTx;
                const overriddenPayeeName = payeeOverrides[idx] || parsed.payee;

                let payee = currentPayees.get(overriddenPayeeName);
                if (!payee && newPayees.has(overriddenPayeeName)) {
                    payee = newPayees.get(overriddenPayeeName);
                }
                if (!payee) {
                    payee = {
                        id: `payee-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        name: overriddenPayeeName,
                        address: null,
                        city: null,
                        state: null,
                        zipCode: null,
                        latitude: null,
                        longitude: null,
                        website: null,
                        phone: null,
                        notes: null,
                        defaultCategoryId: null,
                        createdAt: now,
                        updatedAt: now
                    };
                    newPayees.set(overriddenPayeeName, payee);
                }

                txsToImport.push({
                    id: `tx-import-${Date.now()}-${idx}`,
                    accountId,
                    payeeId: payee.id,
                    date: parsed.date,
                    payee: overriddenPayeeName,
                    memo: parsed.memo,
                    totalAmount: parsed.amount,
                    status: TransactionStatus.Cleared,
                    checkNumber: parsed.checkNumber,
                    importHash: parsed.importHash,
                    splits:
                        parsed.splits && parsed.splits.length > 0
                            ? parsed.splits.map((s, sIdx) => ({
                                  id: `split-import-${Date.now()}-${idx}-${sIdx}`,
                                  amount: s.amount,
                                  memo: s.memo || '',
                                  categoryId:
                                      categoryOverrides[idx] ||
                                      this.mapQifCategory(s.category ?? undefined)
                              }))
                            : [
                                  {
                                      id: `split-import-${Date.now()}-${idx}`,
                                      amount: parsed.amount,
                                      memo: parsed.memo,
                                      categoryId:
                                          categoryOverrides[idx] ||
                                          this.mapQifCategory(parsed.category ?? undefined)
                                  }
                              ],
                    createdAt: now,
                    updatedAt: now
                });
            } else if (decision === 'match') {
                const targetMatchId = matchOverrides[idx] || match.existingTxId;
                if (targetMatchId) {
                    const existingTx = this.transactions().find(t => t.id === targetMatchId);
                    if (existingTx) {
                        txsToUpdate.push({
                            ...existingTx,
                            status: TransactionStatus.Cleared,
                            updatedAt: now
                        });
                        matchedCount++;
                    }
                }
            } else {
                ignoredCount++;
            }
        }

        if (newPayees.size > 0 || txsToImport.length > 0 || txsToUpdate.length > 0) {
            await this.ledgerStore.applyReconciliationBatch(
                Array.from(newPayees.values()),
                txsToImport,
                txsToUpdate
            );
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
        done();
    }

    handleReviewFirst(): void {
        this.expressImportOpen.set(false);
        this.reconciliationOpen.set(true);
    }

    handleImportCancelled(): void {
        this.importService.reset();
    }

    private mapQifCategory(qifCategory: string | undefined): string {
        if (!qifCategory) return KnownCategory.Uncategorized;

        // If it's already a valid category ID, use it directly
        const categories = this.ledgerStore.categories();
        if (categories.some(c => c.id === qifCategory)) {
            return qifCategory;
        }

        // Clean: remove brackets and take the last part after ':'
        const cleanNameRaw = qifCategory.replace(/[[\]]/g, '').trim();
        let cleanName = cleanNameRaw;
        if (cleanNameRaw.includes(':')) {
            const parts = cleanNameRaw.split(':');
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
                cleanName = lastPart.trim();
            }
        }

        const match = categories.find(c => c.name.toLowerCase() === cleanName.toLowerCase());

        return match ? match.id : KnownCategory.Uncategorized;
    }

    // ── Edit Transaction ──────────────────────────────────────────────────────

    readonly entryForm = viewChild(TransactionEntryFormComponent);

    editTransaction(tx: ITransaction): void {
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
            this.openEditTransactionMobile(tx);
        } else {
            this.entryForm()?.editTransaction(tx);
        }
    }

    async deleteTransaction(txId: string): Promise<void> {
        await this.ledgerStore.removeTransaction(txId);
        this.messageService.add({
            severity: 'success',
            summary: 'Transaction Deleted',
            detail: 'The transaction has been removed.',
            life: 3000
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    getAccountIcon(type: AccountType | undefined): string {
        switch (type) {
            case AccountType.Checking:
                return 'pi-building-columns';
            case AccountType.Savings:
                return 'pi-chart-line';
            case AccountType.Credit:
                return 'pi-credit-card';
            case AccountType.Cash:
                return 'pi-wallet';
            default:
                return 'pi-building-columns';
        }
    }

    getAccountBalance(accId: string): number {
        return this.transactions()
            .filter(t => t.accountId === accId)
            .reduce((s, t) => s + t.totalAmount, 0);
    }

    // ── Icons ─────────────────────────────────────────────────────────────────
}
