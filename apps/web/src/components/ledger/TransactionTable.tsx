'use client';

import * as React from 'react';
import {
    ColumnDef,
    ColumnFiltersState,
    Row,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ITransaction, Money, TransactionStatus } from '@path-logic/core';
import { cn } from '@/lib/utils';

export const columns: Array<ColumnDef<ITransaction>> = [
    {
        accessorKey: 'date',
        header: ({ column }): React.JSX.Element => {
            return (
                <Button
                    variant="ghost"
                    onClick={(): void => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="p-0 hover:bg-transparent text-[10px] h-auto font-bold uppercase"
                >
                    Date
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
            );
        },
        cell: ({ row }): React.JSX.Element => <div className="font-mono text-[10px] text-[#64748B]">{row.getValue('date')}</div>,
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
                    <span className="text-[9px] bg-[#1E293B] px-1.5 py-0.5 rounded-sm border border-[#334155] text-[#94A3B8] whitespace-nowrap uppercase tracking-tighter">
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
        header: (): React.JSX.Element => <div className="text-[10px] font-bold uppercase">Status</div>,
        cell: ({ row }): React.JSX.Element => {
            const status = row.original.status;
            return (
                <div
                    className={cn(
                        "text-[9px] font-bold uppercase",
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
        header: ({ column }): React.JSX.Element => {
            return (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        onClick={(): void => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="p-0 hover:bg-transparent text-[10px] h-auto font-bold uppercase ml-auto"
                    >
                        Amount
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                </div>
            );
        },
        cell: ({ row }): React.JSX.Element => {
            const amount = parseFloat(row.getValue('totalAmount'));
            const formatted = Money.formatCurrency(amount);

            return (
                <div className={cn(
                    "text-right font-mono font-bold text-[11px]",
                    amount < 0 ? "text-[#EF4444]" : "text-[#10B981]"
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

const LedgerRow = React.memo(({
    row,
    isActive,
    onClick
}: {
    row: Row<ITransaction>,
    isActive: boolean,
    onClick: () => void
}): React.JSX.Element => {
    return (
        <TableRow
            data-state={row.getIsSelected() && 'selected'}
            data-active={isActive}
            className={cn(
                "hover:bg-[#1E293B]/50 border-none group cursor-pointer h-9 transition-colors",
                isActive && "bg-[#1E293B] outline outline-1 outline-[#38BDF8] z-1"
            )}
            onClick={onClick}
        >
            {row.getVisibleCells().map((cell): React.JSX.Element => (
                <TableCell key={cell.id} className="py-0 px-3 h-9">
                    {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                    )}
                </TableCell>
            ))}
        </TableRow>
    );
});

LedgerRow.displayName = 'LedgerRow';

export function TransactionTable({ data }: ITransactionTableProps): React.JSX.Element {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [monthsToShow, setMonthsToShow] = React.useState(6);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const lastKeyTime = React.useRef<number>(0);

    // Filter data based on the time window
    const windowedData = React.useMemo(() => {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthsToShow);
        return data.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= cutoff;
        });
    }, [data, monthsToShow]);

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

    // Use useLayoutEffect for more immediate scroll feedback before paint
    React.useLayoutEffect(() => {
        const activeRow = containerRef.current?.querySelector('[data-active="true"]');
        if (activeRow) {
            activeRow.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    }, [activeIndex]);

    // Safety: Clamp activeIndex when data or filters change the row count
    React.useEffect(() => {
        const rowCount = table.getRowModel().rows.length;
        if (rowCount > 0 && activeIndex >= rowCount) {
            setActiveIndex(rowCount - 1);
        }
    }, [table.getRowModel().rows.length]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            // Throttle state updates to roughly 60fps (16ms)
            const now = performance.now();
            if (now - lastKeyTime.current < 16) return;
            lastKeyTime.current = now;

            if (e.key === 'ArrowDown') {
                setActiveIndex(prev => Math.min(prev + 1, table.getRowModel().rows.length - 1));
            } else {
                setActiveIndex(prev => Math.max(prev - 1, 0));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeRow = table.getRowModel().rows[activeIndex];
            if (activeRow) {
                console.log('Editing transaction:', activeRow.original);
            }
        }
    };

    return (
        <div className="w-full flex flex-col h-full overflow-hidden focus:outline-none" onKeyDown={handleKeyDown} tabIndex={0}>
            <div className="flex items-center py-2 px-1 justify-between">
                <Input
                    placeholder="Filter ledger (CMD+K)..."
                    value={(table.getColumn('payee')?.getFilterValue() as string) ?? ''}
                    onChange={(event) =>
                        table.getColumn('payee')?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm h-7 text-[10px] bg-[#0F1115] border-[#1E293B] uppercase tracking-wider focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
                />
                <div className="text-[9px] font-mono text-[#64748B] uppercase px-2">
                    Showing last {monthsToShow} months
                </div>
            </div>
            <div className="flex-1 border border-[#1E293B] rounded-sm bg-[#0F1115] relative overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-auto" ref={containerRef}>
                    <Table>
                        <TableHeader className="bg-[#1E293B] sticky top-0 z-20">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-[#0F1115]">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="h-8 px-3 text-[#64748B] font-bold">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody className="divide-y divide-[#1E293B]">
                            {table.getRowModel().rows?.length ? (
                                <>
                                    {table.getRowModel().rows.map((row, idx) => (
                                        <LedgerRow
                                            key={row.id}
                                            row={row}
                                            isActive={idx === activeIndex}
                                            onClick={() => setActiveIndex(idx)}
                                        />
                                    ))}
                                    {/* Load More Row */}
                                    {windowedData.length < data.length && (
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableCell colSpan={columns.length} className="p-0">
                                                <button
                                                    onClick={() => setMonthsToShow(prev => prev + 6)}
                                                    className="w-full py-4 text-[10px] font-bold text-[#38BDF8] hover:bg-[#38BDF8]/5 uppercase tracking-[0.2em] transition-colors border-t border-[#1E293B]/50"
                                                >
                                                    ↓ Load Additional 6 Months of History ↓
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-32 text-center text-[#64748B] text-[10px] uppercase tracking-widest"
                                    >
                                        No transactions in this window.
                                        <button
                                            onClick={() => setMonthsToShow(prev => prev + 6)}
                                            className="block mx-auto mt-4 text-[#38BDF8] hover:underline"
                                        >
                                            Check older history?
                                        </button>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="flex items-center justify-between py-2 px-1 text-[9px] font-mono text-[#64748B] uppercase">
                <div className="flex-1">
                    Showing {windowedData.length} of {data.length} Transactions
                </div>
            </div>
        </div>
    );
}
