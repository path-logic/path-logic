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
import type { IReconciliationMatch } from '@core';
import { Money } from '@core';
import {
    AlertCircle,
    ArrowRight,
    CheckCheck,
    CheckCircle,
    HelpCircle,
    Link as LinkIcon,
    LucideAngularModule,
    PlusCircle,
    X,
    Zap
} from 'lucide-angular';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import type { IImportStats, ReconciliationDecision } from '../../../services/import/import.types';
import { LARGE_DATASET_THRESHOLD } from '../../../services/import/import.types';
import { PostHogService } from '../../../services/posthog/posthog.service';

export type { IReconciliationMatch };

type ReviewTab = 'all' | 'new' | 'review' | 'skipped';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

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
    imports: [CommonModule, FormsModule, LucideAngularModule, Dialog, Button],
    templateUrl: './reconciliation-dialog.component.html',
    styleUrls: ['./reconciliation-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReconciliationDialogComponent {
    private readonly posthogService = inject(PostHogService);

    // ── Inputs ────────────────────────────────────────────────────────────────

    readonly isOpen = model<boolean>(false);
    readonly matches = input.required<Array<IReconciliationMatch>>();
    readonly importStats = input<IImportStats | null>(null);

    // ── Outputs ───────────────────────────────────────────────────────────────

    readonly confirmed = output<Record<number, ReconciliationDecision>>();

    // ── State ─────────────────────────────────────────────────────────────────

    readonly decisions = signal<Record<number, ReconciliationDecision>>({});
    readonly isProcessing = signal<boolean>(false);

    // Smart Review state
    readonly activeTab = signal<ReviewTab>('all');
    readonly page = signal<number>(0);
    readonly pageSize = signal<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
    readonly selectedIndices = signal<Set<number>>(new Set());
    readonly smartDefaultsApplied = signal<boolean>(false);

    // Express import mode (zero fuzzy matches)
    readonly expressMode = signal<boolean>(false);

    // ── Computed ──────────────────────────────────────────────────────────────

    readonly isLargeDataset = computed(() => this.matches().length >= LARGE_DATASET_THRESHOLD);

    readonly isZeroFuzzy = computed(() => {
        const stats = this.importStats();
        return stats !== null && stats.fuzzyCount === 0;
    });

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
        // Initialize decisions when matches change
        effect(() => {
            const currentMatches = this.matches();
            const initial: Record<number, ReconciliationDecision> = {};
            currentMatches.forEach((match, idx) => {
                if (match.type === 'none') initial[idx] = 'import';
                else if (match.type === 'fuzzy') initial[idx] = 'match';
                else if (match.type === 'exact') initial[idx] = 'ignore';
            });
            this.decisions.set(initial);
            this.smartDefaultsApplied.set(false);
            this.expressMode.set(false);
            this.activeTab.set('all');
            this.page.set(0);
            this.selectedIndices.set(new Set());
        });
    }

    // ── Decision helpers ──────────────────────────────────────────────────────

    setDecision(idx: number, decision: ReconciliationDecision): void {
        this.decisions.update(prev => ({ ...prev, [idx]: decision }));
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

    async handleExpressImport(): Promise<void> {
        // Apply smart defaults then immediately confirm
        this.applySmartDefaults();
        await this.handleApply();
    }

    async handleApply(): Promise<void> {
        this.isProcessing.set(true);
        try {
            const decisionsSnapshot = this.decisions();
            const values = Object.values(decisionsSnapshot);
            this.confirmed.emit(decisionsSnapshot);
            this.posthogService.posthog.capture('reconciliation_completed', {
                total_matches: this.matches().length,
                imported_count: values.filter(d => d === 'import').length,
                matched_count: values.filter(d => d === 'match').length,
                ignored_count: values.filter(d => d === 'ignore').length,
                is_large_dataset: this.isLargeDataset(),
                smart_defaults_used: this.smartDefaultsApplied()
            });
            this.isOpen.set(false);
        } catch (err: unknown) {
            console.error('Failed to apply reconciliation decisions', err);
        } finally {
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

    /** Template helper: safely cast a string to ReviewTab without a template `as` cast. */
    asTab(id: string): ReviewTab {
        return id as ReviewTab;
    }

    readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

    // ── Icons ─────────────────────────────────────────────────────────────────

    readonly AlertCircle = AlertCircle;
    readonly ArrowRight = ArrowRight;
    readonly CheckCheck = CheckCheck;
    readonly CheckCircle = CheckCircle;
    readonly HelpCircle = HelpCircle;
    readonly LinkIcon = LinkIcon;
    readonly PlusCircle = PlusCircle;
    readonly X = X;
    readonly Zap = Zap;
}
