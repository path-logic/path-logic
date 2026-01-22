'use client';

import { useState, useRef, useMemo } from 'react';
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
import { TransactionTable } from '@/components/ledger/TransactionTable';
import { SplitEntryDialog } from '@/components/ledger/SplitEntryDialog';
import { cn } from '@/lib/utils';
import { Landmark, Banknote, CreditCard, Wallet, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SyncIndicator } from '@/components/sync/SyncIndicator';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuLabel
} from '@/components/ui/context-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AccountEditForm } from "@/components/accounts/AccountEditForm";

interface IAccountLedgerProps {
    initialAccountId?: string | null;
}

export function AccountLedger({ initialAccountId = null }: IAccountLedgerProps): React.JSX.Element {
    const {
        accounts,
        transactions,
        addTransaction,
        addTransactions,
        getOrCreatePayee,
        updateAccount,
        softDeleteAccount,
    } = useLedgerStore();

    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(initialAccountId);
    const fileInputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);

    // Form state (MS Money Style)
    const [entryPayee, setEntryPayee] = useState<string>('');
    const [entryAmount, setEntryAmount] = useState<string>('');
    const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
    const [entryMemo, setEntryMemo] = useState<string>('');
    const [isSplitDialogOpen, setIsSplitDialogOpen] = useState<boolean>(false);
    const [manualSplits, setManualSplits] = useState<Array<ISplit>>([]);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
    const [accountToEdit, setAccountToEdit] = useState<IAccount | null>(null);

    // Filter transactions for active account
    const filteredTransactions = useMemo(() => {
        if (!activeAccountId) return transactions;
        return transactions.filter(tx => tx.accountId === activeAccountId);
    }, [transactions, activeAccountId]);

    // Calculate balances
    const clearedBalance: number = filteredTransactions
        .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Cleared)
        .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

    const pendingBalance: number = filteredTransactions
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
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".qif" className="hidden" />

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
                            {accounts.map((acc: IAccount): React.JSX.Element => (
                                <ContextMenu key={acc.id}>
                                    <ContextMenuTrigger>
                                        <div
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
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="w-48">
                                        <ContextMenuLabel>{acc.name}</ContextMenuLabel>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem onClick={() => setAccountToEdit(acc)}>
                                            Edit Account...
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => setActiveAccountId(acc.id)}>
                                            View Ledger
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem
                                            variant="destructive"
                                            onClick={() => setAccountToDelete(acc.id)}
                                        >
                                            Delete Account
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>

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

                <div className="flex items-center justify-between flex-none px-1">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isImporting} className="h-7 text-xs font-black uppercase bg-primary/10 border-primary/20 text-primary hover:bg-primary/20">
                            {isImporting ? 'Processing QIF...' : 'Import Data'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs font-black uppercase">
                            Reconcile
                        </Button>
                    </div>
                </div>

                <Card className="flex-1 min-h-0 relative border-border rounded-sm overflow-hidden flex flex-col group">
                    {isImporting && (
                        <div className="absolute inset-0 bg-background/80 z-20 flex items-center justify-center backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Processing Ledger Data...</p>
                            </div>
                        </div>
                    )}
                    <TransactionTable data={filteredTransactions} />
                </Card>
            </div>

            <SplitEntryDialog
                isOpen={isSplitDialogOpen}
                onClose={(): void => setIsSplitDialogOpen(false)}
                totalAmount={Money.dollarsToCents(parseFloat(entryAmount) || 0)}
                initialSplits={manualSplits}
                onSave={handleSplitSave}
            />

            <Dialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black tracking-widest text-destructive">Confirm Account Deletion</DialogTitle>
                        <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">
                            Are you sure you want to delete this account? Transactions will be retained for reporting, but the account will be hidden from the sidebar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAccountToDelete(null)} className="text-xs font-bold uppercase">Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (accountToDelete) {
                                    await softDeleteAccount(accountToDelete);
                                    setAccountToDelete(null);
                                }
                            }}
                            className="text-xs font-bold uppercase"
                        >
                            Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!accountToEdit} onOpenChange={() => setAccountToEdit(null)}>
                <DialogContent className="sm:max-w-[425px] md:max-w-[600px] border-border bg-card">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black tracking-widest text-primary">Edit Account Details</DialogTitle>
                        <DialogDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-50">
                            Full historical adjustment and metadata configuration
                        </DialogDescription>
                    </DialogHeader>
                    {accountToEdit && (
                        <AccountEditForm
                            account={accountToEdit}
                            onCancel={() => setAccountToEdit(null)}
                            onSubmit={async (updated: IAccount): Promise<void> => {
                                await updateAccount(updated);
                                setAccountToEdit(null);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
