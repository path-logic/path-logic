'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';
import { Money, type IAccount, AccountType } from '@path-logic/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronDown, ChevronRight, Landmark, CreditCard, Wallet, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignInButton } from '@/components/auth/SignInButton';
import { AppShell } from '@/components/layout/AppShell';

export default function AccountsPage(): React.JSX.Element {
    const { data: session } = useSession();
    const { accounts, isInitialized, initialize } = useLedgerStore();
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    React.useEffect((): void => {
        if (session && !isInitialized) {
            initialize();
        }
    }, [session, isInitialized, initialize]);

    if (!session) return <SignInButton />;

    const getIcon = (type: AccountType): React.JSX.Element => {
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
            <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
                <header className="flex justify-between items-center flex-none">
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest mb-1 text-primary">
                            Accounts <span className="text-foreground">Management</span>
                        </h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                            Configure institutions and starting balances
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase h-8 border-primary/20 text-primary hover:bg-primary/10">
                        <Plus className="w-3.5 h-3.5 mr-2" /> Add Account
                    </Button>
                </header>

                <Card className="flex-1 bg-card border-border rounded-sm overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-2">
                            {accounts.length === 0 ? (
                                <div className="border border-dashed border-border p-12 text-center rounded-sm">
                                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">No accounts found</p>
                                </div>
                            ) : (
                                accounts.map((account: IAccount) => (
                                    <div
                                        key={account.id}
                                        className={cn(
                                            "transition-all overflow-hidden border rounded-sm",
                                            expandedId === account.id
                                                ? "bg-accent/40 border-primary/50 shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                                                : "bg-transparent border-border/50 hover:border-primary/30"
                                        )}
                                    >
                                        <div
                                            className="p-3 flex items-center justify-between cursor-pointer select-none h-14"
                                            onClick={(): void => setExpandedId(expandedId === account.id ? null : account.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-sm flex items-center justify-center transition-colors shadow-inner",
                                                    expandedId === account.id ? "bg-primary text-primary-foreground font-black" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {getIcon(account.type)}
                                                </div>
                                                <div>
                                                    <h3 className="text-[11px] font-black uppercase tracking-tight">{account.name}</h3>
                                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em]">{account.institutionName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Cleared Balance</p>
                                                    <p className={cn(
                                                        "font-mono font-bold text-[12px]",
                                                        account.clearedBalance >= 0 ? "text-emerald-500" : "text-destructive"
                                                    )}>
                                                        {Money.formatCurrency(account.clearedBalance)}
                                                    </p>
                                                </div>
                                                {expandedId === account.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                                            </div>
                                        </div>

                                        {expandedId === account.id && (
                                            <div className="px-14 pb-4 pt-0 border-t border-border/50 animate-in slide-in-from-top-1">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                                                    <div>
                                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2 tracking-widest">Metadata</p>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold uppercase"><span className="text-muted-foreground/50">Type:</span> {account.type}</p>
                                                            <p className="text-[10px] font-bold uppercase"><span className="text-muted-foreground/50">Status:</span> {account.isActive ? 'Active' : 'Archived'}</p>
                                                            <p className="text-[10px] font-mono text-muted-foreground/70"><span className="uppercase font-sans font-bold text-[10px] text-muted-foreground/50">ID:</span> {account.id}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2 tracking-widest">Stats</p>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold uppercase"><span className="text-muted-foreground/50">Pending:</span> <span className="font-mono text-amber-500">{Money.formatCurrency(account.pendingBalance)}</span></p>
                                                            <p className="text-[10px] font-bold uppercase"><span className="text-muted-foreground/50">Created:</span> {new Date(account.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col justify-end gap-2">
                                                        <Button variant="outline" size="sm" className="text-[9px] uppercase font-black h-7">
                                                            Edit Details
                                                        </Button>
                                                        <Button size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary text-[9px] uppercase font-black h-7 border border-primary/20">
                                                            View Ledger
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </AppShell>
    );
}
