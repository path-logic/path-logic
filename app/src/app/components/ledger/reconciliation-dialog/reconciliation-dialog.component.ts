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
    signal,
    untracked
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IReconciliationMatch, ITransaction } from '@core';
import { GLOBAL_DATE_FORMAT, Money } from '@core';
import { PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { IImportStats, ReconciliationDecision } from '../../../services/import/import.types';
import { LARGE_DATASET_THRESHOLD } from '../../../services/import/import.types';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { PayeeAutocompleteComponent } from '../../payees/payee-autocomplete/payee-autocomplete.component';

export type { IReconciliationMatch };

type ReviewTab = 'all' | 'new' | 'review' | 'skipped';

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/**
 * ReconciliationDialogComponent — review and resolve QIF import matches.
 *
 * Two rendering modes:
 * - **Small** (< LARGE_DATASET_THRESHOLD matches): card-per-entry UX
 * - **Large** (≥ LARGE_DATASET_THRESHOLD matches): Smart Review mode with
 *   tabs, pagination, bulk actions, and "Apply Smart Defaults" shortcut
 */
@Component({
    selector: 'reconciliation-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        Dialog,
        Button,
        PrimeTemplate,
        SelectButtonModule,
        PayeeAutocompleteComponent
    ],
    templateUrl: './reconciliation-dialog.component.html',
    styleUrls: ['./reconciliation-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReconciliationDialogComponent {
    private readonly posthogService = inject(PostHogService);
    private readonly ledgerStore = inject(LedgerStore);

    readonly globalDateFormat = GLOBAL_DATE_FORMAT;

    // ── Inputs ────────────────────────────────────────────────────────────────

    readonly isOpen = model<boolean>(false);
    readonly matches = input.required<Array<IReconciliationMatch>>();
    readonly importStats = input<IImportStats | null>(null);

    // ── Outputs ───────────────────────────────────────────────────────────────

    readonly confirmed = output<{
        decisions: Record<number, ReconciliationDecision>;
        done: () => void;
    }>();

    // ── State ─────────────────────────────────────────────────────────────────

    readonly decisions = signal<Record<number, ReconciliationDecision>>({});
    readonly payeeOverrides = signal<Record<number, unknown>>({});
    readonly matchOverrides = signal<Record<number, string>>({});
    readonly isProcessing = signal<boolean>(false);
    readonly editingMatchIdx = signal<number | null>(null);

    readonly decisionOptions = [
        { label: 'Import', value: 'import', icon: 'pi pi-plus' },
        { label: 'Match', value: 'match', icon: 'pi pi-link' },
        { label: 'Ignore', value: 'ignore', icon: 'pi pi-times' }
    ];

    // Smart Review state
    readonly activeTab = signal<ReviewTab>('all');
    readonly page = signal<number>(0);
    readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
    readonly pageSize = signal<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
    readonly selectedIndices = signal<Set<number>>(new Set());
    readonly smartDefaultsApplied = signal<boolean>(false);

    // ── Computed ──────────────────────────────────────────────────────────────

    readonly dialogWidth = computed(() => {
        return this.isLargeDataset() ? '72rem' : '60rem';
    });

    readonly dialogClasses = computed(() => {
        return 'penny-dialog overflow-hidden ';
    });

    readonly isLargeDataset = computed(() => this.matches().length >= LARGE_DATASET_THRESHOLD);

    readonly tabCounts = computed(() => {
        const m = this.matches();
        return {
            all: m.length,
            new: m.filter(x => x.type === 'none').length,
            review: m.filter(x => x.type === 'fuzzy').length,
            skipped: m.filter(x => x.type === 'exact').length
        };
    });

    readonly filteredMatches = computed(() => {
        const tab = this.activeTab();
        return this.matches()
            .map((match, globalIdx) => ({ match, globalIdx }))
            .filter(({ match }) => {
                if (tab === 'all') return true;
                if (tab === 'new') return match.type === 'none';
                if (tab === 'review') return match.type === 'fuzzy';
                if (tab === 'skipped') return match.type === 'exact';
                return true;
            });
    });

    readonly pageCount = computed(() =>
        Math.max(1, Math.ceil(this.filteredMatches().length / this.pageSize()))
    );

    readonly pagedMatches = computed(() => {
        const start = this.page() * this.pageSize();
        return this.filteredMatches().slice(start, start + this.pageSize());
    });

    readonly allVisibleSelected = computed(() => {
        const visible = this.pagedMatches();
        const sel = this.selectedIndices();
        return visible.length > 0 && visible.every(({ globalIdx }) => sel.has(globalIdx));
    });

    readonly selectedCount = computed(() => this.selectedIndices().size);

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    constructor() {
        // Initialize decisions when matches change and when dialog opens
        effect(() => {
            const currentMatches = this.matches();
            if (this.isOpen()) {
                untracked(() => {
                    const initial: Record<number, ReconciliationDecision> = {};
                    currentMatches.forEach((match, idx) => {
                        if (match.type === 'none') initial[idx] = 'import';
                        else if (match.type === 'fuzzy') initial[idx] = 'match';
                        else if (match.type === 'exact') initial[idx] = 'ignore';
                    });
                    this.decisions.set(initial);
                    this.payeeOverrides.set({});
                    this.matchOverrides.set({});
                    this.editingMatchIdx.set(null);
                    this.smartDefaultsApplied.set(false);
                    this.activeTab.set('all');
                    this.page.set(0);
                    this.selectedIndices.set(new Set());
                });
            }
        });
    }

    // ── Decision helpers ──────────────────────────────────────────────────────

    setDecision(idx: number, decision: ReconciliationDecision): void {
        this.decisions.update(prev => ({ ...prev, [idx]: decision }));
    }

    setPayeeOverride(idx: number, payee: unknown): void {
        this.payeeOverrides.update(prev => ({ ...prev, [idx]: payee }));
    }

    setMatchOverride(idx: number, txId: string): void {
        this.matchOverrides.update(prev => ({ ...prev, [idx]: txId }));
        this.editingMatchIdx.set(null); // Stop editing after selection
    }

    /**
     * Smart Defaults: auto-resolve 'new' → import, 'exact' → ignore.
     * 'fuzzy' matches remain for manual review.
     */
    applySmartDefaults(): void {
        this.decisions.update(prev => {
            const updated = { ...prev };
            this.matches().forEach((match, idx) => {
                if (match.type === 'none') updated[idx] = 'import';
                else if (match.type === 'exact') updated[idx] = 'ignore';
                // fuzzy: keep as 'match', user must review
            });
            return updated;
        });
        this.smartDefaultsApplied.set(true);
        // Jump to the 'Review Needed' tab if there are fuzzy matches
        if (this.tabCounts().review > 0) {
            this.activeTab.set('review');
            this.page.set(0);
        }
    }

    // ── Bulk actions ──────────────────────────────────────────────────────────

    toggleSelectAll(): void {
        const visible = this.pagedMatches().map(x => x.globalIdx);
        const sel = new Set(this.selectedIndices());
        if (this.allVisibleSelected()) {
            visible.forEach(i => sel.delete(i));
        } else {
            visible.forEach(i => sel.add(i));
        }
        this.selectedIndices.set(sel);
    }

    bulkSetDecision(decision: ReconciliationDecision): void {
        this.decisions.update(prev => {
            const updated = { ...prev };
            this.selectedIndices().forEach(idx => {
                updated[idx] = decision;
            });
            return updated;
        });
        this.selectedIndices.set(new Set());
    }

    toggleSelected(idx: number): void {
        const sel = new Set(this.selectedIndices());
        if (sel.has(idx)) sel.delete(idx);
        else sel.add(idx);
        this.selectedIndices.set(sel);
    }

    // ── Tab & pagination ──────────────────────────────────────────────────────

    setTab(tab: ReviewTab): void {
        this.activeTab.set(tab);
        this.page.set(0);
        this.selectedIndices.set(new Set());
    }

    prevPage(): void {
        this.page.update(p => Math.max(0, p - 1));
    }

    nextPage(): void {
        this.page.update(p => Math.min(this.pageCount() - 1, p + 1));
    }

    setPageSize(size: (typeof PAGE_SIZE_OPTIONS)[number]): void {
        this.pageSize.set(size);
        this.page.set(0);
    }

    // ── Confirm ───────────────────────────────────────────────────────────────

    async handleApply(): Promise<void> {
        this.isProcessing.set(true);
        // Yield to the event loop so the browser can paint the loading spinner
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const decisionsSnapshot = this.decisions();
            const values = Object.values(decisionsSnapshot);

            this.posthogService.posthog.capture('reconciliation_completed', {
                total_matches: this.matches().length,
                imported_count: values.filter(d => d === 'import').length,
                matched_count: values.filter(d => d === 'match').length,
                ignored_count: values.filter(d => d === 'ignore').length,
                is_large_dataset: this.isLargeDataset(),
                smart_defaults_used: this.smartDefaultsApplied()
            });

            this.confirmed.emit({
                decisions: decisionsSnapshot,
                done: () => {
                    this.isProcessing.set(false);
                    this.isOpen.set(false);
                }
            });
        } catch (err: unknown) {
            console.error('Failed to apply reconciliation decisions', err);
            this.isProcessing.set(false);
        }
    }

    onClose(): void {
        if (!this.isProcessing()) {
            this.isOpen.set(false);
        }
    }

    // ── Formatting ────────────────────────────────────────────────────────────

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    decisionLabel(d: ReconciliationDecision | undefined): string {
        switch (d) {
            case 'import':
                return 'Import';
            case 'match':
                return 'Match';
            case 'ignore':
                return 'Skip';
            default:
                return '—';
        }
    }

    decisionClass(d: ReconciliationDecision | undefined): string {
        switch (d) {
            case 'import':
                return 'text-primary bg-primary/10 border-primary/20';
            case 'match':
                return 'text-amber-700 bg-amber-500/10 border-amber-500/20';
            case 'ignore':
                return 'text-surface-500 bg-surface-100 border-surface-200';
            default:
                return '';
        }
    }

    // ── Template Helpers ──────────────────────────────────────────────────────

    getExistingTx(id: string | undefined): ITransaction | undefined {
        if (!id) return undefined;
        return this.ledgerStore.transactions().find(t => t.id === id);
    }

    getCandidateTransactions(dateStr: string): Array<ITransaction> {
        const txs = this.ledgerStore.transactions();
        const baseDate = new Date(dateStr).getTime();
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;

        return txs.filter(t => {
            const tDate = new Date(t.date).getTime();
            return Math.abs(tDate - baseDate) <= fourteenDays;
        });
    }

    getEffectiveMatchId(idx: number, originalId: string | undefined): string | undefined {
        return this.matchOverrides()[idx] || originalId;
    }

    /** Template helper: safely cast a string to ReviewTab without a template `as` cast. */
    asTab(id: string): ReviewTab {
        return id as ReviewTab;
    }

    // ── Icons ─────────────────────────────────────────────────────────────────
}
