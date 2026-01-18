'use client';

import * as React from 'react';
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    Row,
    SortingState,
    VisibilityState,
    useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type ITransaction, Money, TransactionStatus } from '@path-logic/core';
import { cn } from '@/lib/utils';

export const columns: Array<ColumnDef<ITransaction>> = [
    {
        accessorKey: 'date',
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase text-nowrap">Date</div>,
        cell: ({ row }): React.JSX.Element => <div className="font-mono text-[10px] text-[#64748B] text-nowrap">{row.getValue('date')}</div>,
    },
    {
        accessorKey: 'payee',
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase text-nowrap">Payee / Memo</div>,
        cell: ({ row }): React.JSX.Element => {
            const tx = row.original;
            return (
                <div className="flex flex-col">
                    <span className="font-semibold text-[#38BDF8] group-hover:text-white text-[11px] truncate max-w-[300px]">
                        {tx.payee}
                    </span>
                    <span className="text-[9px] text-[#64748B] truncate max-w-[300px]">
                        {tx.splits.length > 0
                            ? `${tx.splits.length} Splits: ${tx.splits[0]?.memo}`
                            : tx.memo}
                    </span>
                </div>
            );
        },
    },
    {
        id: 'category',
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase">Category</div>,
        cell: ({ row }): React.JSX.Element => {
            const tx = row.original;
            return (
                <div className="flex items-center">
                    <span className="text-[9px] bg-[#1E293B] px-1.5 py-0.5 rounded-sm border border-[#334155] text-[#94A3B8] whitespace-nowrap uppercase tracking-tighter font-bold">
                        {tx.splits.length > 1
                            ? 'SPLIT'
                            : (tx.splits[0]?.categoryId ?? 'UNCATEGORIZED')}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: 'status',
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase text-nowrap">Status</div>,
        cell: ({ row }): React.JSX.Element => {
            const status = row.original.status;
            return (
                <div
                    className={cn(
                        "text-[9px] font-bold uppercase text-nowrap",
                        status === TransactionStatus.Cleared ? "text-[#10B981]" :
                            status === TransactionStatus.Pending ? "text-[#F59E0B]" : "text-[#38BDF8]"
                    )}
                >
                    {status}
                </div>
            );
        },
    },
    {
        accessorKey: 'totalAmount',
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase text-nowrap">Amount</div>,
        cell: ({ row }): React.JSX.Element => {
            const amount = parseFloat(row.getValue('totalAmount'));
            const formatted = Money.formatCurrency(amount);

            return (
                <div className={cn(
                    "text-right font-mono font-bold text-[11px] text-nowrap",
                    amount < 0 ? "text-[#FCA5A5]" : "text-[#10B981]"
                )}>
                    {formatted}
                </div>
            );
        },
    },
    {
        id: 'balance',
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase text-nowrap">Balance</div>,
        cell: ({ row }): React.JSX.Element => {
            const balance = (row.original as ITransaction & { runningBalance?: number }).runningBalance ?? 0;
            const formatted = Money.formatCurrency(balance);

            return (
                <div className={cn(
                    "text-right font-mono font-bold text-[11px] text-nowrap",
                    balance < 0 ? "text-[#FCA5A5]" : "text-[#10B981]"
                )}>
                    {formatted}
                </div>
            );
        },
    },
];

interface ITransactionTableProps {
    data: Array<ITransaction>;
}

interface IMemoizedLedgerRowProps {
    row: Row<ITransaction>;
    virtualRow: {
        key: React.Key;
        index: number;
        start: number;
    };
    isActive: boolean;
    setActiveIndex: (index: number) => void;
}

const MemoizedLedgerRow = React.memo(({
    row,
    virtualRow,
    isActive,
    setActiveIndex
}: IMemoizedLedgerRowProps) => {
    return (
        <div
            key={virtualRow.key}
            data-state={row.getIsSelected() && 'selected'}
            className={cn(
                "flex items-center hover:bg-[#1E293B]/50 border-none group cursor-pointer h-9 transition-colors absolute w-full",
                isActive && "bg-[#1E293B] outline outline-1 outline-[#38BDF8] z-10"
            )}
            style={{
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
            }}
            onClick={(): void => setActiveIndex(virtualRow.index)}
        >
            {row.getVisibleCells().map((cell) => {
                const widthMap: Record<string, string> = {
                    'date': 'w-[100px]',
                    'payee': 'flex-1 min-w-[300px]',
                    'category': 'w-[140px]',
                    'status': 'w-[100px]',
                    'totalAmount': 'w-[120px]',
                    'balance': 'w-[120px]'
                };
                const widthClass = widthMap[cell.column.id] || 'w-[100px]';

                return (
                    <div
                        key={cell.id}
                        className={cn("px-3 h-9 flex items-center overflow-hidden", widthClass)}
                    >
                        {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                        )}
                    </div>
                );
            })}
        </div>
    );
}, (prev, next) => {
    return prev.isActive === next.isActive &&
        prev.virtualRow.index === next.virtualRow.index &&
        prev.virtualRow.start === next.virtualRow.start &&
        prev.row.id === next.row.id &&
        prev.row.getIsSelected() === next.row.getIsSelected();
});
MemoizedLedgerRow.displayName = 'MemoizedLedgerRow';

export function TransactionTable({ data }: ITransactionTableProps): React.JSX.Element {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [monthsToShow, setMonthsToShow] = React.useState(6);
    const [isAtTop, setIsAtTop] = React.useState(true);
    const parentRef = React.useRef<HTMLDivElement>(null);
    const lastKeyTime = React.useRef<number>(0);

    // Sort and calculate running balances for the ENTIRE dataset
    const sortedDataWithBalances = React.useMemo(() => {
        // 1. Sort by date (ASC), then by type priority (income first)
        const sorted = [...data].sort((a, b) => {
            // Primary: Date comparison
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            // Secondary: Income (positive) before expenses (negative)
            const aPriority = a.totalAmount >= 0 ? 0 : 1;
            const bPriority = b.totalAmount >= 0 ? 0 : 1;
            return aPriority - bPriority;
        });

        // 2. Calculate cumulative running balance
        let runningBalance = 0;
        return sorted.map((tx) => {
            runningBalance += tx.totalAmount;
            return { ...tx, runningBalance };
        });
    }, [data]);

    // Filter data centered on current date
    const windowedData = React.useMemo(() => {
        const today = new Date();
        const pastCutoff = new Date(today);
        pastCutoff.setMonth(pastCutoff.getMonth() - monthsToShow);
        const futureCutoff = new Date(today);
        futureCutoff.setMonth(futureCutoff.getMonth() + 3); // Show 3 months into future

        return sortedDataWithBalances.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate >= pastCutoff && txDate <= futureCutoff;
        });
    }, [sortedDataWithBalances, monthsToShow]);

    const table = useReactTable({
        data: windowedData,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    const { rows } = table.getRowModel();

    // Virtualization setup
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 36, // h-9
        overscan: 20, // Balanced for smoothness vs render cost
    });

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            // Throttle state updates to roughly 60fps (16ms)
            const now = performance.now();
            if (now - lastKeyTime.current < 16) return;
            lastKeyTime.current = now;

            if (rows.length === 0) return;

            const nextIndex = e.key === 'ArrowDown'
                ? Math.min(activeIndex + 1, rows.length - 1)
                : Math.max(activeIndex - 1, 0);

            if (nextIndex !== activeIndex) {
                setActiveIndex(nextIndex);
                virtualizer.scrollToIndex(nextIndex, { align: 'auto', behavior: 'auto' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeRow = rows[activeIndex];
            if (activeRow) {
                console.log('Editing transaction:', activeRow.original);
            }
        }
    };

    // Safety: Clamp activeIndex when data or filters change the row count
    React.useEffect((): void => {
        if (rows.length > 0 && activeIndex >= rows.length) {
            setActiveIndex(rows.length - 1);
        } else if (rows.length === 0 && activeIndex !== 0) {
            setActiveIndex(0);
        }
    }, [rows.length]);

    // Track scroll position to show/hide Load Older History button
    React.useEffect(() => {
        const scrollElement = parentRef.current;
        if (!scrollElement) return;

        const handleScroll = (): void => {
            const scrollTop = scrollElement.scrollTop;
            setIsAtTop(scrollTop < 50); // Show button when within 50px of top
        };

        scrollElement.addEventListener('scroll', handleScroll);
        return () => scrollElement.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to current date or newest transaction on initial load
    React.useEffect(() => {
        if (rows.length === 0) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the index of today's date or the closest future date
        let targetIndex = rows.findIndex((row) => {
            const rowDate = new Date(row.original.date);
            rowDate.setHours(0, 0, 0, 0);
            return rowDate >= today;
        });

        // If no future dates found, scroll to the last (newest) transaction
        if (targetIndex === -1) {
            targetIndex = rows.length - 1;
        }

        // Scroll to the target index
        virtualizer.scrollToIndex(targetIndex, { align: 'center', behavior: 'auto' });
        setActiveIndex(targetIndex);
    }, [rows.length, virtualizer]);

    return (
        <div className="w-full flex flex-col h-full overflow-hidden focus:outline-none" onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Toolbar */}
            <div className="flex items-center py-2 px-1 justify-between flex-none bg-[#0F1115]">
                <Input
                    placeholder="Filter ledger (CMD+K)..."
                    value={(table.getColumn('payee')?.getFilterValue() as string) ?? ''}
                    onChange={(event): void =>
                        table.getColumn('payee')?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm h-7 text-[10px] bg-[#0F1115] border-[#1E293B] uppercase tracking-wider focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
                />
                <div className="text-[9px] font-mono text-[#64748B] uppercase px-2 translate-y-1">
                    Showing {rows.length} records • Last {monthsToShow} months
                </div>
            </div>

            <div className="flex-1 border border-[#1E293B] rounded-sm bg-[#0F1115] relative flex flex-col min-h-0 overflow-hidden">
                {/* Header - Fixed at top, independent of scroll */}
                <div className="flex-none bg-[#1E293B] border-b border-[#0F1115] z-20">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <div key={headerGroup.id} className="flex h-8 px-1 items-center">
                            {headerGroup.headers.map((header) => {
                                // Define explicit widths or flex basis for alignment
                                const widthMap: Record<string, string> = {
                                    'date': 'w-[100px]',
                                    'payee': 'flex-1 min-w-[300px]',
                                    'category': 'w-[140px]',
                                    'status': 'w-[100px]',
                                    'totalAmount': 'w-[120px]',
                                    'balance': 'w-[120px]'
                                };
                                const widthClass = widthMap[header.id] || 'w-[100px]';

                                return (
                                    <div
                                        key={header.id}
                                        className={cn(
                                            "px-3 text-[#64748B] font-bold text-[10px] uppercase",
                                            widthClass
                                        )}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Body - Scrollable Virtual Area */}
                <div
                    ref={parentRef}
                    className="flex-1 overflow-auto ledger-scroll"
                >
                    {/* Load Older History - Now at the top */}
                    {windowedData.length < data.length && rows.length > 0 && isAtTop && (
                        <div className="px-3 border-b border-[#1E293B] bg-[#0F1115] sticky top-0 z-10">
                            <button
                                onClick={(): void => setMonthsToShow(prev => prev + 6)}
                                className="w-full py-4 text-[9px] font-bold text-[#38BDF8] hover:text-[#38BDF8] hover:bg-[#38BDF8]/5 uppercase tracking-[0.2em] transition-colors"
                            >
                                ↑ Load older history (currently showing {monthsToShow} months) ↑
                            </button>
                        </div>
                    )}

                    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const row = rows[virtualRow.index];
                            if (!row) return null;

                            return (
                                <MemoizedLedgerRow
                                    key={virtualRow.key}
                                    row={row}
                                    virtualRow={virtualRow}
                                    isActive={virtualRow.index === activeIndex}
                                    setActiveIndex={setActiveIndex}
                                />
                            );
                        })}
                    </div>

                    {rows.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-[#64748B] text-[10px] uppercase tracking-widest gap-4 min-h-[300px] text-center px-8 relative z-10">
                            {data.length === 0 ? (
                                <>
                                    <div className="text-[#38BDF8] font-bold">Ledger is empty</div>
                                    <div>Import a QIF file or add a transaction to get started</div>
                                </>
                            ) : windowedData.length === 0 ? (
                                <>
                                    <div>No transactions in the last {monthsToShow} months</div>
                                    <button
                                        onClick={(): void => setMonthsToShow(prev => prev + 6)}
                                        className="text-[#38BDF8] hover:underline font-bold"
                                    >
                                        Check older history?
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>No transactions match your current filters</div>
                                    <button
                                        onClick={(): void => table.resetColumnFilters()}
                                        className="text-[#38BDF8] hover:underline font-bold"
                                    >
                                        Clear all filters
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between py-2 px-1 text-[9px] font-mono text-[#64748B] uppercase bg-[#0F1115] flex-none">
                <div className="flex-1">
                    Showing {windowedData.length} of {data.length} Transactions
                </div>
            </div>
        </div>
    );
}
