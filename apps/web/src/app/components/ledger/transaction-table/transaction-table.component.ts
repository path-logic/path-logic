import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import type { ElementRef, OnInit } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    HostListener,
    inject,
    input,
    model,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ITransaction } from '@path-logic/core';
import { KnownCategory, Money, TransactionStatus } from '@path-logic/core';
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/angular-table';
import {
    createAngularTable,
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
} from '@tanstack/angular-table';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { CheckCircle2, Clock, LucideAngularModule } from 'lucide-angular';

/**
 * High-density transaction table component.
 * Uses TanStack Table for logic and TanStack Virtual for performance.
 * Features keyboard navigation and context menu integration.
 */
@Component({
    selector: 'app-transaction-table',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './transaction-table.component.html',
    styleUrls: ['./transaction-table.component.css'],
    providers: [DecimalPipe, DatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionTableComponent implements OnInit {
    private readonly decimalPipe = inject(DecimalPipe);
    private readonly datePipe = inject(DatePipe);

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

    // Template children
    readonly parentRef = viewChild<ElementRef<HTMLDivElement>>('parentRef');

    // Column Helper
    private readonly columnHelper = createColumnHelper<ITransaction>();

    // Columns Definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly columns: Array<ColumnDef<ITransaction, any>> = new Array<ColumnDef<ITransaction, any>>(
        this.columnHelper.accessor('date', {
            header: () => 'Date',
            cell: info => info.getValue(),
        }),
        this.columnHelper.accessor('payee', {
            header: () => 'Payee / Memo',
            cell: info => {
                const tx = info.row.original;
                return {
                    payee: tx.payee,
                    memo:
                        tx.splits.length > 1
                            ? `${tx.splits.length} Splits: ${tx.splits[0]?.memo || ''}`
                            : tx.memo,
                };
            },
        }),
        this.columnHelper.accessor(row => row, {
            id: 'category',
            header: () => 'Category',
            cell: info => {
                const tx = info.getValue();
                return tx.splits.length > 1
                    ? 'SPLIT'
                    : (tx.splits[0]?.categoryId ?? KnownCategory.Uncategorized);
            },
        }),
        this.columnHelper.accessor('status', {
            header: () => 'Status',
            cell: info => info.getValue(),
        }),
        this.columnHelper.accessor('totalAmount', {
            header: () => 'Amount',
            cell: info => info.getValue(),
        }),
        this.columnHelper.accessor(
            row => (row as ITransaction & { runningBalance?: number }).runningBalance ?? 0,
            {
                id: 'balance',
                header: () => 'Balance',
                cell: info => info.getValue(),
            },
        ),
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
            columnFilters: this.columnFilters(),
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
        getFilteredRowModel: getFilteredRowModel(),
    }));

    // Virtualization
    readonly virtualizer = injectVirtualizer(() => ({
        count: this.table.getRowModel().rows.length,
        scrollElement: this.parentRef()?.nativeElement ?? undefined,
        estimateSize: (): number => 36, // h-9
        overscan: 20,
    }));

    ngOnInit(): void {
        // Initial scroll to today
        setTimeout(() => this.scrollToToday(), 100);
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
        return 'text-[9px] bg-accent px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground whitespace-nowrap uppercase tracking-tighter font-bold';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getStatusIcon(status: TransactionStatus): any {
        return status === TransactionStatus.Cleared ? CheckCircle2 : Clock;
    }

    getStatusClass(status: string): string {
        if (status === TransactionStatus.Cleared) return 'text-emerald-900';
        if (status === TransactionStatus.Pending) return 'text-amber-500';
        return 'text-primary';
    }

    private scrollToToday(): void {
        const rows = this.table.getRowModel().rows;
        if (rows.length === 0) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let targetIndex = rows.findIndex(row => {
            const rowDate = new Date(row.original.date);
            rowDate.setHours(0, 0, 0, 0);
            return rowDate >= today;
        });

        if (targetIndex === -1) targetIndex = rows.length - 1;

        this.virtualizer.scrollToIndex(targetIndex, { align: 'center' });
        this.activeIndex.set(targetIndex);
    }

    // Lucide icons
    readonly CheckCircle2 = CheckCircle2;
    readonly Clock = Clock;
}
