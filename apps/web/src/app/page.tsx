'use client';

import { useEffect, useRef, useState } from 'react';

import {
    type ISODateString,
    type ITransaction,
    Money,
    QIFParser,
    TransactionStatus,
} from '@path-logic/core';

export default function Dashboard(): React.JSX.Element {
    const [transactions, setTransactions] = useState<Array<ITransaction>>([]);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    // Calculate balances from current transaction state
    const clearedBalance = transactions
        .filter(tx => tx.status === TransactionStatus.Cleared)
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const pendingBalance = transactions
        .filter(tx => tx.status === TransactionStatus.Pending)
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async e => {
            const content = e.target?.result as string;
            const parser = new QIFParser();
            const result = parser.parse(content);

            if (result.transactions.length > 0) {
                // Map parsed transactions to the UI transaction format
                // In a real app, this would go through the TransactionEngine
                const newTransactions: Array<ITransaction> = result.transactions.map(
                    (pt, idx) =>
                        ({
                            id: `imported-${Date.now()}-${idx}`,
                            accountId: 'acc-imported',
                            date: pt.date,
                            payee: pt.payee,
                            totalAmount: pt.amount,
                            status: TransactionStatus.Cleared, // Default to cleared for QIF imports
                            checkNumber: pt.checkNumber,
                            memo: pt.memo,
                            importHash: pt.importHash,
                            splits: pt.splits.map((s, sIdx) => ({
                                id: `split-${Date.now()}-${idx}-${sIdx}`,
                                categoryId: s.category, // Using category name as ID for now
                                amount: s.amount,
                                memo: s.memo || '',
                            })),
                            createdAt: new Date().toISOString() as ISODateString,
                            updatedAt: new Date().toISOString() as ISODateString,
                        }) satisfies ITransaction,
                );

                setTransactions(prev => {
                    const combined = [...newTransactions, ...prev];
                    // Sort by date descending (latest first)
                    return combined.sort((a, b) => b.date.localeCompare(a.date));
                });
            }

            if (result.errors.length > 0) {
                console.error('QIF Parse Errors:', result.errors);
                alert(
                    `Import failed with ${result.errors.length} errors. Check console for details.`,
                );
            } else if (result.warnings.length > 0) {
                console.warn('QIF Parse Warnings:', result.warnings);
            }

            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsText(file);
    };

    return (
        <main className="h-screen bg-[#0F1115] text-[#E2E8F0] font-sans p-6 overflow-hidden flex flex-col">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".qif"
                className="hidden"
            />

            {/* Bloomberg-style Header */}
            <header className="flex-none flex items-center justify-between border-b border-[#1E293B] pb-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#38BDF8]">
                        PATH LOGIC <span className="text-[#64748B] font-normal">{'// LEDGER'}</span>
                    </h1>
                    <p className="text-xs text-[#64748B] uppercase tracking-widest mt-1">
                        Real-time Terminal v1.0.0
                    </p>
                </div>
                <div className="flex gap-8 items-center">
                    <div className="text-right">
                        <p className="text-[10px] text-[#64748B] uppercase mb-1">Total Cleared</p>
                        <p className="text-lg font-mono text-[#10B981]">
                            {Money.formatCurrency(clearedBalance)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-[#64748B] uppercase mb-1">Pending</p>
                        <p className="text-lg font-mono text-[#F59E0B]">
                            {Money.formatCurrency(pendingBalance)}
                        </p>
                    </div>
                </div>
            </header>

            {/* Grid Layout - Now flex-1 with min-h-0 to force container size */}
            <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 mb-8">
                {/* Sidebar / Accounts */}
                <div className="col-span-2 border-r border-[#1E293B] pr-4 overflow-y-auto">
                    <h2 className="text-[10px] text-[#64748B] uppercase mb-4 tracking-wider">
                        Accounts
                    </h2>
                    <div className="space-y-2">
                        <div className="bg-[#1E293B] border-l-2 border-[#38BDF8] p-3 rounded-sm cursor-pointer hover:bg-[#2D3748] transition-colors">
                            <p className="text-xs font-semibold">In-Memory Store</p>
                            <p className="text-[10px] text-[#64748B]">Volatile Session</p>
                        </div>
                    </div>
                </div>

                {/* Main Ledger Table */}
                <div className="col-span-10 flex flex-col min-h-0">
                    <div className="flex-none flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <button
                                onClick={handleImportClick}
                                disabled={isImporting}
                                className="bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 text-[#0F1115] text-[10px] font-bold px-3 py-1 rounded-sm uppercase transition-colors"
                            >
                                {isImporting ? 'Importing...' : 'Import QIF'}
                            </button>
                            <button className="bg-[#1E293B] text-[#E2E8F0] text-[10px] font-bold px-3 py-1 rounded-sm uppercase opacity-50 cursor-not-allowed">
                                Reconcile
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="FILTER LEDGER..."
                            className="bg-[#0F1115] border border-[#1E293B] text-[10px] px-3 py-1 rounded-sm focus:outline-none focus:border-[#38BDF8] w-64 uppercase tracking-wider"
                        />
                    </div>

                    <div className="flex-1 border border-[#1E293B] rounded-sm overflow-hidden flex flex-col relative min-h-0">
                        {isImporting && (
                            <div className="absolute inset-0 bg-[#0F1115]/80 z-20 flex items-center justify-center backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-[0.2em]">
                                        Processing Ledger Data...
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 overflow-auto min-h-0">
                            <table className="w-full text-left border-collapse font-mono text-xs">
                                <thead className="sticky top-0 bg-[#1E293B] text-[#64748B] uppercase text-[10px] z-10">
                                    <tr>
                                        <th className="p-3 border-b border-[#0F1115] w-24">Date</th>
                                        <th className="p-3 border-b border-[#0F1115]">
                                            Payee / Memo
                                        </th>
                                        <th className="p-3 border-b border-[#0F1115] w-32">
                                            Category
                                        </th>
                                        <th className="p-3 border-b border-[#0F1115] w-24">
                                            Status
                                        </th>
                                        <th className="p-3 border-b border-[#0F1115] w-32 text-right">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E293B]">
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-12 text-center text-[#64748B] uppercase tracking-widest text-[10px]"
                                            >
                                                No transactions found. Click &quot;Import QIF&quot;
                                                to begin.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map(tx => (
                                            <tr
                                                key={tx.id}
                                                className="hover:bg-[#1E293B] transition-colors group cursor-pointer"
                                            >
                                                <td className="p-3 font-medium text-[#64748B] whitespace-nowrap">
                                                    {tx.date}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-[#38BDF8] group-hover:text-white">
                                                        {tx.payee}
                                                    </div>
                                                    <div className="text-[10px] text-[#64748B] truncate max-w-md">
                                                        {tx.splits.length > 0
                                                            ? `${tx.splits.length} Splits: ${tx.splits[0]?.memo}`
                                                            : tx.memo}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-[10px] bg-[#1E293B] px-2 py-0.5 rounded-full border border-[#334155] text-[#94A3B8] whitespace-nowrap">
                                                        {tx.splits.length > 0
                                                            ? 'SPLIT'
                                                            : (tx.splits[0]?.categoryId ??
                                                              'UNCATEGORIZED')}
                                                    </span>
                                                </td>
                                                <td className="p-3 uppercase text-[9px] font-bold">
                                                    <span
                                                        className={
                                                            tx.status === TransactionStatus.Cleared
                                                                ? 'text-[#10B981]'
                                                                : tx.status ===
                                                                    TransactionStatus.Pending
                                                                  ? 'text-[#F59E0B]'
                                                                  : 'text-[#38BDF8]'
                                                        }
                                                    >
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td
                                                    className={`p-3 text-right font-bold ${tx.totalAmount < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}
                                                >
                                                    {Money.formatCurrency(tx.totalAmount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Status Bar */}
            <footer className="fixed bottom-0 left-0 right-0 bg-[#1E293B] border-t border-[#334155] px-4 py-1 flex justify-between items-center text-[9px] text-[#94A3B8] uppercase tracking-widest leading-none">
                <div className="flex gap-4 items-center">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse"></span>{' '}
                        Terminal Active
                    </span>
                    <span>QIF Parser: Ready</span>
                </div>
                <div className="flex gap-4 items-center">
                    <span>{mounted ? new Date().toLocaleDateString() : ''}</span>
                    <span>{mounted ? new Date().toLocaleTimeString() : ''}</span>
                </div>
            </footer>
        </main>
    );
}
