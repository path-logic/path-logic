'use client';

import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';
import {
    type ITransaction,
    TransactionStatus,
    Money,
    generateProjection,
    AccountType,
} from '@path-logic/core';
import { SignInButton } from '@/components/auth/SignInButton';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectionChart } from '@/components/dashboard/ProjectionChart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wallet, TrendingUp, Clock, CreditCard, Landmark, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function DashboardOverview(): React.JSX.Element {
    const { data: session, status } = useSession();
    const { transactions, accounts, initialize, isInitialized } = useLedgerStore();

    useEffect((): void => {
        if (session && !isInitialized) {
            initialize();
        }
    }, [session, isInitialized, initialize]);

    // Calculate Net Position
    const { netPosition, clearedBalance, pendingBalance } = useMemo(() => {
        const cleared = transactions
            .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Cleared)
            .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

        const pending = transactions
            .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Pending)
            .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

        return {
            clearedBalance: cleared,
            pendingBalance: pending,
            netPosition: cleared + pending,
        };
    }, [transactions]);

    // Recent Transactions
    const recentTransactions = useMemo(() => {
        return [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [transactions]);

    // Financial Projection
    const projection = useMemo(() => {
        if (!isInitialized) return [];

        return generateProjection(new Date().toISOString().split('T')[0] || '', 90, {
            clearedBalance: clearedBalance,
            pendingTransactions: transactions.filter(t => t.status === TransactionStatus.Pending),
            recurringSchedules: [], // To be implemented in next phase
        });
    }, [isInitialized, clearedBalance, transactions]);

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

    const getAccountIcon = (type: AccountType): React.JSX.Element => {
        switch (type) {
            case AccountType.Checking:
                return <Landmark className="w-4 h-4" />;
            case AccountType.Savings:
                return <TrendingUp className="w-4 h-4" />;
            case AccountType.Credit:
                return <CreditCard className="w-4 h-4" />;
            default:
                return <Wallet className="w-4 h-4" />;
        }
    };

    return (
        <AppShell>
            <div className="w-full mx-auto space-y-8 pb-12">
                {/* Header Section */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                            Financial <span className="text-primary">Overview</span>
                        </h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
                            Snapshot of your net worth and future outlook
                        </p>
                    </div>
                    <Link href="/accounts">
                        <Button
                            size="sm"
                            className="hidden md:flex font-black uppercase text-[10px] tracking-widest gap-2"
                        >
                            <Plus className="w-3 h-3" /> Add Account
                        </Button>
                    </Link>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 bg-card border-border flex flex-col gap-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="w-16 h-16" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Net Position
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span
                                className={cn(
                                    'text-3xl font-mono font-black tracking-tighter',
                                    netPosition >= 0 ? 'text-foreground' : 'text-destructive',
                                )}
                            >
                                {Money.formatCurrency(netPosition)}
                            </span>
                        </div>
                        <div className="flex gap-4 mt-2">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                                    Cleared
                                </span>
                                <span className="text-xs font-mono font-bold text-emerald-500">
                                    {Money.formatCurrency(clearedBalance)}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                                    Pending
                                </span>
                                <span className="text-xs font-mono font-bold text-amber-500">
                                    {Money.formatCurrency(pendingBalance)}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-card border-border md:col-span-2 overflow-hidden items-center justify-center">
                        <ProjectionChart data={projection} height={120} />
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Accounts Summary */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                My Accounts
                            </h2>
                            <Link
                                href="/accounts"
                                className="text-[10px] font-bold text-primary uppercase hover:underline"
                            >
                                Manage All
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {accounts.length === 0 ? (
                                <Card className="p-8 border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center col-span-full">
                                    <Landmark className="w-8 h-8 text-muted-foreground/30 mb-3" />
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        No accounts connected yet
                                    </p>
                                    <Link href="/accounts" className="mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] font-black uppercase"
                                        >
                                            Get Started
                                        </Button>
                                    </Link>
                                </Card>
                            ) : (
                                accounts.slice(0, 4).map(account => (
                                    <Link key={account.id} href={`/accounts/${account.id}`}>
                                        <Card className="p-4 hover:border-primary/50 transition-all cursor-pointer bg-card border-border hover:shadow-[0_0_20px_rgba(56,189,248,0.05)] group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        {getAccountIcon(account.type)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[11px] font-black uppercase tracking-tight truncate max-w-[120px]">
                                                            {account.name}
                                                        </h3>
                                                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[120px]">
                                                            {account.institutionName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="mt-4 flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                        Current Balance
                                                    </span>
                                                    <span className="text-sm font-mono font-bold tracking-tighter">
                                                        {Money.formatCurrency(
                                                            account.clearedBalance +
                                                                account.pendingBalance,
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        'w-1.5 h-1.5 rounded-full',
                                                        account.isActive
                                                            ? 'bg-emerald-500'
                                                            : 'bg-muted',
                                                    )}
                                                    title={account.isActive ? 'Active' : 'Inactive'}
                                                />
                                            </div>
                                        </Card>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Recent Activity
                            </h2>
                            <Clock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <Card className="bg-card border-border overflow-hidden">
                            <ScrollArea className="h-[360px]">
                                <div className="divide-y divide-border/50">
                                    {recentTransactions.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                                                No recent transactions
                                            </p>
                                        </div>
                                    ) : (
                                        recentTransactions.map(tx => (
                                            <div
                                                key={tx.id}
                                                className="p-4 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex flex-col gap-0.5 max-w-[140px]">
                                                        <span className="text-[10px] font-black uppercase tracking-tight truncate">
                                                            {tx.payee}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                            {new Date(tx.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'text-xs font-mono font-bold',
                                                            tx.totalAmount < 0
                                                                ? 'text-destructive'
                                                                : 'text-emerald-500',
                                                        )}
                                                    >
                                                        {tx.totalAmount > 0 ? '+' : ''}
                                                        {Money.formatCurrency(tx.totalAmount)}
                                                    </span>
                                                </div>
                                                {tx.memo && (
                                                    <p className="text-[9px] text-muted-foreground italic truncate">
                                                        {tx.memo}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                            {recentTransactions.length > 0 && (
                                <div className="p-3 bg-muted/20 border-t border-border text-center">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Use Accounts to see full history
                                    </p>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

export default function Dashboard(): React.JSX.Element {
    return <DashboardOverview />;
}
