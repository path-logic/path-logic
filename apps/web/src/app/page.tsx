'use client';

import type {
    IParsedSplit,
    IParsedTransaction,
    ISODateString,
    ISplit,
    ITransaction,
} from '@path-logic/core';
import {
    Money,
    QIFParser,
    TransactionStatus,
} from '@path-logic/core';
import React, { useEffect, useRef, useState } from 'react';

import { TransactionTable } from '@/components/ledger/TransactionTable';
import { cn } from '@/lib/utils';

export default function Dashboard(): React.JSX.Element {
    const [transactions, setTransactions] = useState<Array<ITransaction>>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect((): (() => void) => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);

        const handleGlobalKeyDown = (e: KeyboardEvent): void => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const filterInput = document.querySelector('input[placeholder*="Filter"]') as HTMLInputElement;
                filterInput?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return (): void => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Calculate balances from current transaction state
    const clearedBalance = transactions
        .filter(tx => tx.status === TransactionStatus.Cleared)
        .reduce((sum, tx): number => sum + tx.totalAmount, 0);

    const pendingBalance = transactions
        .filter(tx => tx.status === TransactionStatus.Pending)
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = (event): void => {
            const content = event.target?.result as string;
            const parser = new QIFParser();
            const result = parser.parse(content);

            if (result.transactions.length > 0) {
                const newTransactions: Array<ITransaction> = result.transactions.map((pt: IParsedTransaction, idx: number): ITransaction => ({
                    id: `import-${Date.now()}-${idx}`,
                    accountId: 'imported',
                    date: pt.date,
                    payee: pt.payee,
                    memo: pt.memo || '',
                    totalAmount: pt.amount,
                    status: TransactionStatus.Cleared,
                    checkNumber: pt.checkNumber || '',
                    importHash: pt.importHash || '',
                    splits: pt.splits.map((s: IParsedSplit, sIdx: number): ISplit => ({
                        id: `split-${Date.now()}-${idx}-${sIdx}`,
                        amount: s.amount,
                        memo: s.memo || '',
                        categoryId: s.category || 'UNCATEGORIZED',
                    })),
                    createdAt: new Date().toISOString() as ISODateString,
                    updatedAt: new Date().toISOString() as ISODateString,
                }));

                setTransactions(prev => {
                    const combined = [...newTransactions, ...prev];
                    return combined.sort((a, b) => b.date.localeCompare(a.date));
                });
            }

            if (result.errors.length > 0) {
                console.error('QIF Parse Errors:', result.errors);
                alert(`Import failed with ${result.errors.length} errors.`);
            } else if (result.warnings.length > 0) {
                console.warn('QIF Parse Warnings:', result.warnings);
            }

            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsText(file);
    };

    if (!mounted) return <div className="h-screen bg-[#0F1115]" />;

    return (
        <div className="h-screen bg-[#0F1115] text-[#E2E8F0] font-sans selection:bg-[#38BDF8]/30 overflow-hidden flex flex-col">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".qif"
                className="hidden"
            />

            {/* Top Navigation / Stats Bar */}
            <header className="border-b border-[#1E293B] bg-[#0F1115]/80 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] rounded-sm flex items-center justify-center">
                                <span className="text-[#0F1115] font-black text-xs">P</span>
                            </div>
                            <h1 className="font-bold text-sm tracking-tight uppercase">
                                Path <span className="text-[#38BDF8]">Logic</span>
                            </h1>
                        </div>

                        <nav className="hidden md:flex items-center gap-1">
                            {['Ledger', 'Reports', 'Projection', 'Settings'].map(tab => (
                                <button
                                    key={tab}
                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-sm ${tab === 'Ledger' ? 'text-[#38BDF8] bg-[#38BDF8]/10' : 'text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#1E293B]'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-tighter">
                                Net Position
                            </span>
                            <span
                                className={`text-sm font-mono font-bold leading-none ${clearedBalance + pendingBalance < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}
                            >
                                {Money.formatCurrency(clearedBalance + pendingBalance)}
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-sm bg-[#1E293B] border border-[#334155] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 flex gap-4 overflow-hidden min-h-0">
                {/* Account Sidebar */}
                <aside className="w-64 flex flex-col gap-4 flex-none overflow-y-auto pr-2 scrollbar-hide">
                    <div className="bg-[#111827] border border-[#1E293B] rounded-sm p-4">
                        <h2 className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest mb-4 border-b border-[#1E293B] pb-2">
                            Accounts
                        </h2>
                        <div className="space-y-1">
                            {[
                                { name: 'Main Checking', balance: clearedBalance, type: 'Asset' },
                                { name: 'Credit Card', balance: -45000, type: 'Liability' }, // Mock
                                { name: 'Cash', balance: 12000, type: 'Asset' }, // Mock
                            ].map((acc, i) => (
                                <div
                                    key={acc.name}
                                    className={cn(
                                        "p-2 rounded-sm cursor-pointer transition-all border border-transparent",
                                        i === 0 ? "bg-[#38BDF8]/10 border-[#38BDF8]/30" : "hover:bg-[#1E293B]/50"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={cn(
                                            "text-[11px] font-bold",
                                            i === 0 ? "text-[#38BDF8]" : "text-[#E2E8F0]"
                                        )}>
                                            {acc.name}
                                        </span>
                                        <span className="text-[8px] text-[#64748B] uppercase font-bold px-1.5 py-0.5 bg-[#0F1115] border border-[#1E293B] rounded-sm">
                                            {acc.type}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "text-xs font-mono font-bold",
                                        acc.balance < 0 ? "text-[#EF4444]" : "text-[#10B981]"
                                    )}>
                                        {Money.formatCurrency(acc.balance)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-[#1E293B] rounded-sm p-4">
                        <h2 className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest mb-4 border-b border-[#1E293B] pb-2">
                            Quick Reports
                        </h2>
                        <div className="space-y-2">
                            {['Net Worth', 'Cash Flow', 'Budget Perf'].map(report => (
                                <button key={report} className="w-full text-left text-[10px] text-[#94A3B8] hover:text-[#38BDF8] py-1 border-b border-[#1E293B]/50 transition-colors uppercase font-bold tracking-tight">
                                    {report}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Ledger View */}
                <div className="flex-1 flex flex-col bg-[#0F1115] border border-[#1E293B] rounded-sm overflow-hidden min-h-0 relative">
                    {/* Toolbar */}
                    <div className="p-2 border-b border-[#1E293B] flex justify-between items-center bg-[#111827]/50">
                        <div className="flex gap-2">
                            <button
                                onClick={handleImportClick}
                                disabled={isImporting}
                                className="bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 text-[#0F1115] text-[10px] font-bold px-3 py-1 rounded-sm uppercase transition-colors flex items-center gap-1.5"
                            >
                                <span className="text-sm leading-none">+</span>
                                {isImporting ? 'Importing...' : 'Import QIF'}
                            </button>
                            <button className="bg-[#1E293B] border border-[#334155] text-[#94A3B8] text-[10px] font-bold px-3 py-1 rounded-sm uppercase hover:bg-[#2D3748] hover:text-white transition-all">
                                Reconcile
                            </button>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-[#64748B] font-bold">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
                                90-Day Projection: +$1,240.00
                            </span>
                        </div>
                    </div>

                    {/* Ledger Content */}
                    <div className="flex-1 min-h-0 relative">
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
                        <div className="h-full">
                            <TransactionTable data={transactions} />
                        </div>
                    </div>
                </div>
            </main>

            {/* Status Footer */}
            <footer className="h-8 border-t border-[#1E293B] bg-[#0F1115] px-4 flex items-center justify-between text-[9px] font-mono text-[#64748B] uppercase">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        Cloud Sync: Active
                    </span>
                    <span>Storage: Google Drive</span>
                </div>
                <div>
                    Last Updated:{' '}
                    {new Date().toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })}
                </div>
            </footer>
        </div>
    );
}
