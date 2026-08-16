import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    HostListener,
    inject,
    input,
    model,
    output,
    signal,
    untracked,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ITransaction } from '@core';
import { KnownCategory, Money, TransactionStatus } from '@core';
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/angular-table';
import {
    createAngularTable,
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel
} from '@tanstack/angular-table';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { LocalDatePipe } from '../../../pipes/local-date.pipe';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * High-density transaction table component.
 * Uses TanStack Table for logic and TanStack Virtual for performance.
 * Features keyboard navigation and context menu integration.
 */
@Component({
    selector: 'transaction-table',
    standalone: true,
    imports: [CommonModule, FormsModule, LocalDatePipe],
    templateUrl: './transaction-table.component.html',
    styleUrls: ['./transaction-table.component.css'],
    providers: [DecimalPipe, DatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionTableComponent {
    private readonly decimalPipe = inject(DecimalPipe);
    private readonly datePipe = inject(DatePipe);
    private readonly ledgerStore = inject(LedgerStore);

    // Inputs
    readonly data = input.required<Array<ITransaction>>();
    readonly className = input<string>('');

    // Outputs
    readonly editClicked = output<ITransaction>();
    readonly deleted = output<string>();
    readonly duplicateClicked = output<ITransaction>();

    // State
    readonly sorting = signal<SortingState>(new Array<SortingState[number]>());
    readonly columnFilters = signal<ColumnFiltersState>(new Array<ColumnFiltersState[number]>());
    readonly activeIndex = model<number>(0);
    readonly monthsToShow = signal<number>(6);
    readonly isAtTop = signal<boolean>(true);

    /** ISO date string for today (YYYY-MM-DD) — used to render the today-divider row. */
    readonly todayDateString = new Date().toISOString().slice(0, 10);

    // Template children
    readonly parentRef = viewChild<ElementRef<HTMLDivElement>>('parentRef');
    readonly mobileContainerRef = viewChild<ElementRef<HTMLDivElement>>('mobileContainer');

    // Column Helper
    private readonly columnHelper = createColumnHelper<ITransaction>();

    // Columns Definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly columns: Array<ColumnDef<ITransaction, any>> = new Array<ColumnDef<ITransaction, any>>(
        this.columnHelper.accessor('date', {
            header: () => 'Date',
            cell: info => info.getValue()
        }),
        this.columnHelper.accessor(
            row => ({
                payee: row.payee,
                memo:
                    row.splits.length > 1
                        ? `${row.splits.length} Splits: ${row.splits[0]?.memo ?? ''}`
                        : (row.memo ?? '')
            }),
            {
                id: 'payee',
                header: () => 'Payee / Memo',
                // Filter against the payee name string, not the composed object
                filterFn: (row, _colId, filterValue: string) =>
                    row.original.payee.toLowerCase().includes((filterValue as string).toLowerCase())
            }
        ),
        this.columnHelper.accessor(
            row => {
                if (row.splits.length > 1) return 'SPLIT';
                const catId = row.splits[0]?.categoryId ?? KnownCategory.Uncategorized;
                const match = this.ledgerStore.categories().find(c => c.id === catId);
                if (match) return match.name;

                // Friendly fallback for cat- prefixed category IDs
                if (catId && catId.startsWith('cat-')) {
                    return catId
                        .substring(4)
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                }
                return catId;
            },
            {
                id: 'category',
                header: () => 'Category'
            }
        ),
        this.columnHelper.accessor('status', {
            header: () => 'Status',
            cell: info => info.getValue()
        }),
        this.columnHelper.accessor('totalAmount', {
            header: () => 'Amount',
            cell: info => info.getValue()
        }),
        this.columnHelper.accessor(
            row => (row as ITransaction & { runningBalance?: number }).runningBalance ?? 0,
            {
                id: 'balance',
                header: () => 'Balance',
                cell: info => info.getValue()
            }
        )
    );

    // Computed: Sorted and Balanced Data
    readonly sortedDataWithBalances = computed(() => {
        const rawData = this.data();
        if (rawData.length === 0) return new Array<ITransaction & { runningBalance: number }>();

        // 1. Sort by date (ASC), then by type priority
        const sorted = [...rawData].sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            const aPriority = a.totalAmount >= 0 ? 0 : 1;
            const bPriority = b.totalAmount >= 0 ? 0 : 1;
            return aPriority - bPriority;
        });

        // 2. Calculate running balance
        let balance = 0;
        return sorted.map(tx => {
            balance += tx.totalAmount;
            return { ...tx, runningBalance: balance };
        }) as Array<ITransaction & { runningBalance: number }>;
    });

    // Computed: Windowed Data (centered on today)
    readonly windowedData = computed(() => {
        const fullData = this.sortedDataWithBalances();
        const months = this.monthsToShow();

        const today = new Date();
        const pastCutoff = new Date(today);
        pastCutoff.setMonth(pastCutoff.getMonth() - months);
        const futureCutoff = new Date(today);
        futureCutoff.setMonth(futureCutoff.getMonth() + 3);

        return fullData.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= pastCutoff && txDate <= futureCutoff;
        });
    });

    // Table Instance
    readonly table = createAngularTable(() => ({
        data: this.windowedData(),
        columns: this.columns,
        state: {
            sorting: this.sorting(),
            columnFilters: this.columnFilters()
        },
        onSortingChange: (updaterOrValue): void => {
            if (typeof updaterOrValue === 'function') {
                this.sorting.update(updaterOrValue);
            } else {
                this.sorting.set(updaterOrValue);
            }
        },
        onColumnFiltersChange: (updaterOrValue): void => {
            if (typeof updaterOrValue === 'function') {
                this.columnFilters.update(updaterOrValue);
            } else {
                this.columnFilters.set(updaterOrValue);
            }
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel()
    }));

    // Virtualization
    readonly virtualizer = injectVirtualizer(() => ({
        count: this.table.getRowModel().rows.length,
        scrollElement: this.parentRef()?.nativeElement ?? undefined,
        estimateSize: (index: number): number => {
            return index === this.dividerRowIndex() ? 76 : 44;
        },
        overscan: 20
    }));

    constructor() {
        effect(() => {
            const rows = this.table.getRowModel().rows;
            if (rows.length > 0) {
                untracked(() => {
                    setTimeout(() => this.scrollToToday(), 50);
                });
            }
        });
    }

    @HostListener('keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent): void {
        const rows = this.table.getRowModel().rows;
        if (rows.length === 0) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const current = this.activeIndex();
            const next =
                event.key === 'ArrowDown'
                    ? Math.min(current + 1, rows.length - 1)
                    : Math.max(current - 1, 0);

            if (next !== current) {
                this.activeIndex.set(next);
                this.virtualizer.scrollToIndex(next, { align: 'auto' });
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const activeRow = rows[this.activeIndex()];
            if (activeRow) {
                this.editClicked.emit(activeRow.original);
            }
        }
    }

    onScroll(event: Event): void {
        const element = event.target as HTMLElement;
        this.isAtTop.set(element.scrollTop < 50);
    }

    loadMoreHistory(): void {
        this.monthsToShow.update(m => m + 6);
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    getCategoryClass(_category: string): string {
        return 'text-[10px] bg-surface-100 px-2 py-0.5 rounded-sm border border-surface-200 text-surface-500 whitespace-nowrap uppercase tracking-tighter font-bold';
    }

    getStatusIcon(status: TransactionStatus): string {
        return status === TransactionStatus.Cleared ? 'pi-check-circle' : 'pi-clock';
    }

    getStatusClass(status: string): string {
        if (status === TransactionStatus.Cleared) return 'text-emerald-700 dark:text-emerald-400';
        if (status === TransactionStatus.Pending) return 'text-amber-500';
        return 'text-primary';
    }

    getCategoryName(tx: ITransaction): string {
        if (tx.splits && tx.splits.length > 1) return `${tx.splits.length} Splits`;
        const catId =
            tx.splits && tx.splits[0]?.categoryId
                ? tx.splits[0].categoryId
                : KnownCategory.Uncategorized;
        const match = this.ledgerStore.categories().find(c => c.id === catId);
        if (match) return match.name;
        if (catId && catId.startsWith('cat-')) {
            return catId
                .substring(4)
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return catId || 'Uncategorized';
    }

    getCategoryIcon(tx: ITransaction): string {
        const catName = this.getCategoryName(tx).toLowerCase();
        if (
            catName.includes('grocer') ||
            catName.includes('food') ||
            catName.includes('supermarket')
        )
            return 'pi-shopping-cart';
        if (
            catName.includes('dining') ||
            catName.includes('coffee') ||
            catName.includes('restaurant')
        )
            return 'pi-coffee';
        if (
            catName.includes('income') ||
            catName.includes('salary') ||
            catName.includes('paycheck')
        )
            return 'pi-building';
        if (catName.includes('util') || catName.includes('electric') || catName.includes('water'))
            return 'pi-bolt';
        if (catName.includes('transport') || catName.includes('gas') || catName.includes('auto'))
            return 'pi-car';
        if (
            catName.includes('subscript') ||
            catName.includes('stream') ||
            catName.includes('entertainment')
        )
            return 'pi-play';
        if (catName.includes('transfer')) return 'pi-arrows-h';
        return tx.totalAmount >= 0 ? 'pi-arrow-down-left' : 'pi-shopping-bag';
    }

    formatMoney(cents: number): string {
        return Money.formatCurrency(cents);
    }

    handleRowClick(index: number, tx: ITransaction): void {
        this.activeIndex.set(index);
        this.editClicked.emit(tx);
    }

    /**
     * Computed index of the first transaction strictly in the future.
     * The divider will be placed immediately before this row.
     */
    readonly dividerRowIndex = computed(() => {
        const rows = this.table.getRowModel().rows;
        if (rows.length === 0) return -1;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const localTodayStr = `${year}-${month}-${day}`;

        return rows.findIndex(row => {
            const txDate = (row.original.date || '').slice(0, 10);
            return txDate > localTodayStr;
        });
    });

    scrollToToday(): void {
        const rows = this.table.getRowModel().rows;
        if (rows.length === 0) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const localTodayStr = `${year}-${month}-${day}`;

        // Find the first row whose date is today or in the future
        let targetIndex = rows.findIndex(row => {
            const txDate = (row.original.date || '').slice(0, 10);
            return txDate >= localTodayStr;
        });
        if (targetIndex === -1) {
            // If all transactions are past, focus the most recent transaction
            targetIndex = rows.length - 1;
        }

        this.activeIndex.set(targetIndex);

        // Desktop / Tablet table scroll via TanStack Virtualizer
        try {
            this.virtualizer.scrollToIndex(targetIndex, { align: 'center' });
        } catch {
            const container = this.parentRef()?.nativeElement;
            if (container && container.clientHeight > 0) {
                const rowHeight = 44;
                const rowTop = targetIndex * rowHeight;
                const offset = Math.max(0, rowTop - container.clientHeight * 0.35);
                container.scrollTop = offset;
            }
        }

        // Mobile card stream scroll
        const mobileContainer = this.mobileContainerRef()?.nativeElement;
        if (mobileContainer && mobileContainer.clientHeight > 0) {
            const cardElements = mobileContainer.children;
            if (cardElements && cardElements.length > targetIndex) {
                const targetCard = cardElements[targetIndex] as HTMLElement;
                if (targetCard && targetCard.offsetTop !== undefined) {
                    const mobileOffset = Math.max(
                        0,
                        targetCard.offsetTop - mobileContainer.clientHeight * 0.35
                    );
                    mobileContainer.scrollTop = mobileOffset;
                }
            } else {
                const cardEstimateHeight = 76;
                const cardTop = targetIndex * cardEstimateHeight;
                const mobileOffset = Math.max(0, cardTop - mobileContainer.clientHeight * 0.35);
                mobileContainer.scrollTop = mobileOffset;
            }
        }

        if (!this.parentRef()?.nativeElement && !mobileContainer) {
            // Container not ready, try again shortly
            setTimeout(() => this.scrollToToday(), 50);
        }
    }

    async toggleTransactionStatus(tx: ITransaction): Promise<void> {
        const newStatus =
            tx.status === TransactionStatus.Cleared || tx.status === TransactionStatus.Reconciled
                ? TransactionStatus.Pending
                : TransactionStatus.Cleared;

        await this.ledgerStore.updateTransaction({
            ...tx,
            status: newStatus
        });
    }
}
