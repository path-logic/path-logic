'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';
import {
    type ITransaction,
    type IParsedTransaction,
    type IParsedSplit,
    type ISplit,
    type ISODateString,
    type IAccount,
    type IPayee,
    type IQIFParseResult,
    TransactionStatus,
    Money,
    QIFParser,
    AccountType,
    KnownCategory
} from '@path-logic/core';
import { SignInButton } from '@/components/auth/SignInButton';
import { TransactionTable } from '@/components/ledger/TransactionTable';
import { SplitEntryDialog } from '@/components/ledger/SplitEntryDialog';
import { SyncIndicator } from '@/components/sync/SyncIndicator';
import { cn } from '@/lib/utils';
import { Landmark, Banknote, CreditCard, Wallet, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { WelcomeWizard } from '@/components/onboarding/WelcomeWizard';

function DashboardContent(): React.JSX.Element {
    const { data: session, status } = useSession();
    const {
        transactions,
        accounts,
        addTransactions,
        addTransaction,
        addAccount,
        initialize,
        isInitialized,
        getOrCreatePayee
    } = useLedgerStore();

    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(true); // Initialize to true to avoid setState-in-effect
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    const fileInputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);

    // Form state (MS Money Style)
    const [entryPayee, setEntryPayee] = useState<string>('');
    const [entryAmount, setEntryAmount] = useState<string>('');
    const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
    const [entryMemo, setEntryMemo] = useState<string>('');
    const [isSplitDialogOpen, setIsSplitDialogOpen] = useState<boolean>(false);
    const [manualSplits, setManualSplits] = useState<Array<ISplit>>([]);


    useEffect((): void => {
        if (session && !isInitialized) {
            initialize();
        }
    }, [session, isInitialized, initialize]);

    // Show loading state
    if (status === 'loading') {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Show sign-in if not authenticated
    if (!session) {
        return <SignInButton />;
    }

    // Calculate balances from current transaction state
    const clearedBalance: number = transactions
        .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Cleared)
        .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

    const pendingBalance: number = transactions
        .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Pending)
        .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader: FileReader = new FileReader();

        reader.onload = async (event: ProgressEvent<FileReader>): Promise<void> => {
            const content: string = event.target?.result as string;
            const parser: QIFParser = new QIFParser();
            const result: IQIFParseResult = parser.parse(content);

            if (result.transactions.length > 0) {
                const now: ISODateString = new Date().toISOString() as ISODateString;
                const newTransactions: Array<ITransaction> = await Promise.all(
                    result.transactions.map(async (pt: IParsedTransaction, idx: number): Promise<ITransaction> => {
                        const payeeEntity: IPayee = await getOrCreatePayee(pt.payee);

                        return {
                            id: `import-${Date.now()}-${idx}`,
                            accountId: activeAccountId || 'imported',
                            payeeId: payeeEntity.id,
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
                                categoryId: s.category || KnownCategory.Uncategorized,
                            })),
                            createdAt: now,
                            updatedAt: now,
                        };
                    })
                );

                // If no splits, create a default one
                newTransactions.forEach((tx: ITransaction): void => {
                    if (tx.splits.length === 0) {
                        tx.splits.push({
                            id: `${tx.id}-split-0`,
                            amount: tx.totalAmount,
                            memo: tx.memo,
                            categoryId: KnownCategory.Uncategorized
                        });
                    }
                });

                await addTransactions(newTransactions);
            }

            if (result.errors.length > 0) {
                console.error('QIF Parse Errors:', result.errors);
                alert(`Import failed with ${result.errors.length} errors.`);
            }

            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsText(file);
    };

    const handleQuickAdd = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!entryPayee || !entryAmount) return;

        const amountCents: number = Money.dollarsToCents(parseFloat(entryAmount));
        const now: ISODateString = new Date().toISOString() as ISODateString;
        const payeeEntity: IPayee = await getOrCreatePayee(entryPayee);

        const tx: ITransaction = {
            id: `tx-${Date.now()}`,
            accountId: activeAccountId || 'default',
            payeeId: payeeEntity.id,
            date: entryDate as ISODateString,
            payee: entryPayee,
            memo: entryMemo,
            totalAmount: amountCents,
            status: TransactionStatus.Cleared,
            checkNumber: null,
            importHash: `manual-${Date.now()}`,
            splits: manualSplits.length > 0 ? manualSplits : [
                {
                    id: `split-${Date.now()}`,
                    amount: amountCents,
                    memo: entryMemo,
                    categoryId: KnownCategory.Uncategorized
                }
            ],
            createdAt: now,
            updatedAt: now,
        };

        await addTransaction(tx);

        // Reset form
        setEntryPayee('');
        setEntryAmount('');
        setEntryMemo('');
        setManualSplits([]);
    };

    const handleSplitSave = (splits: Array<ISplit>, newTotal?: number): void => {
        setManualSplits(splits);
        if (newTotal !== undefined) {
            setEntryAmount(Money.centsToDollars(newTotal).toString());
        }
    };

    if (!mounted) return <div className="h-screen bg-background" />;

    const getAccountIcon = (type: AccountType): React.JSX.Element => {
        switch (type) {
            case AccountType.Checking: return <Landmark className="w-3.5 h-3.5" />;
            case AccountType.Savings: return <Banknote className="w-3.5 h-3.5" />;
            case AccountType.Credit: return <CreditCard className="w-3.5 h-3.5" />;
            case AccountType.Cash: return <Wallet className="w-3.5 h-3.5" />;
            default: return <Landmark className="w-3.5 h-3.5" />;
        }
    };

    return (
        <AppShell>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".qif" className="hidden" />

            {/* Show Welcome Wizard if no accounts exist */}
            {accounts.length === 0 ? (
                <WelcomeWizard onAccountCreated={addAccount} />
            ) : (
                <>
                    {/* Account Sidebar */}
                    <aside className="w-64 flex flex-col gap-4 flex-none overflow-hidden pr-2">
                        <Card className="bg-card border-border rounded-sm h-full flex flex-col overflow-hidden">
                            <div className="px-4 py-3 flex justify-between items-center border-b border-border bg-muted/30">
                                <h2 className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Accounts</h2>
                                <Link href="/accounts" className="text-primary hover:text-white transition-colors">
                                    <Plus className="w-3 h-3" />
                                </Link>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {accounts.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic text-center py-4 uppercase">No accounts yet</p>
                                    ) : (
                                        accounts.map((acc: IAccount): React.JSX.Element => (
                                            <div
                                                key={acc.id}
                                                onClick={(): void => setActiveAccountId(acc.id)}
                                                className={cn(
                                                    "p-2 rounded-sm cursor-pointer transition-all border",
                                                    activeAccountId === acc.id ? "bg-primary/10 border-primary/30" : "bg-transparent border-transparent hover:bg-accent/50"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={cn("text-sm font-bold", activeAccountId === acc.id ? "text-primary" : "text-foreground")}>
                                                        {acc.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground opacity-50">
                                                        {getAccountIcon(acc.type)}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-mono font-bold text-muted-foreground">
                                                    {Money.formatCurrency(transactions.filter((t: ITransaction): boolean => t.accountId === acc.id).reduce((s: number, t: ITransaction): number => s + t.totalAmount, 0))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>

                        {/* Quick Stats / Sync Mini Card */}
                        <Card className="bg-card border-border rounded-sm p-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Sync Engine</span>
                                <SyncIndicator />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground uppercase font-bold tracking-tighter">Cleared</span>
                                    <span className="font-mono text-emerald-500 font-bold">{Money.formatCurrency(clearedBalance)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground uppercase font-bold tracking-tighter">Pending</span>
                                    <span className="font-mono text-amber-500 font-bold">{Money.formatCurrency(pendingBalance)}</span>
                                </div>
                            </div>
                        </Card>
                    </aside>

                    {/* Main Ledger Area */}
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        {/* Transaction Entry Form (MS Money Style) */}
                        <Card className="bg-card border-border rounded-sm p-3 shadow-lg flex-none relative z-10">
                            <form onSubmit={handleQuickAdd} className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Date</label>
                                    <Input
                                        type="date"
                                        value={entryDate}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEntryDate(e.target.value)}
                                        className="h-7 text-xs font-mono uppercase px-2"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Payee / Recipient</label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1.5 w-3 h-3 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Who did you pay?"
                                            value={entryPayee}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEntryPayee(e.target.value)}
                                            className="h-7 pl-7 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Amount</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={entryAmount}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEntryAmount(e.target.value)}
                                        className="h-7 text-sm font-mono text-emerald-500 px-2"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Memo / Description</label>
                                    <Input
                                        type="text"
                                        placeholder="What was it for?"
                                        value={entryMemo}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEntryMemo(e.target.value)}
                                        className="h-7 text-sm px-2"
                                    />
                                </div>
                                <div className="col-span-2 flex gap-2">
                                    <Button type="submit" className="flex-1 text-xs font-black uppercase h-7">
                                        Record
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={(): void => setIsSplitDialogOpen(true)}
                                        className={cn(
                                            "px-2 text-xs uppercase font-bold h-7",
                                            manualSplits.length > 0 && "border-primary text-primary bg-primary/10"
                                        )}
                                    >
                                        {manualSplits.length > 0 ? `${manualSplits.length} Splits` : 'Split'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between flex-none px-1">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isImporting} className="h-7 text-xs font-black uppercase bg-primary/10 border-primary/20 text-primary hover:bg-primary/20">
                                    {isImporting ? 'Processing QIF...' : 'Import Data'}
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs font-black uppercase">
                                    Reconcile
                                </Button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-tighter">
                                <span className="flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded-sm border border-primary/10 text-primary">
                                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                                    90-Day Projection: + $4,240.00
                                </span>
                            </div>
                        </div>

                        {/* Ledger Content */}
                        <Card className="flex-1 min-h-0 relative border-border rounded-sm overflow-hidden flex flex-col group">
                            {isImporting && (
                                <div className="absolute inset-0 bg-background/80 z-20 flex items-center justify-center backdrop-blur-sm">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Processing Ledger Data...</p>
                                    </div>
                                </div>
                            )}
                            <TransactionTable data={transactions} />
                        </Card>
                    </div>
                    {/* Modal for Splits */}
                    <SplitEntryDialog
                        isOpen={isSplitDialogOpen}
                        onClose={(): void => setIsSplitDialogOpen(false)}
                        totalAmount={Money.dollarsToCents(parseFloat(entryAmount) || 0)}
                        initialSplits={manualSplits}
                        onSave={handleSplitSave}
                    />
                </>
            )}
        </AppShell>
    );
}

export default function Dashboard(): React.JSX.Element {
    return <DashboardContent />;
}
