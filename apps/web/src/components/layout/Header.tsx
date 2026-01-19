'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Landmark, Banknote, CreditCard, Wallet, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Money, TransactionStatus } from '@path-logic/core';
import { useLedgerStore } from '@/store/ledgerStore';
import { useSession } from 'next-auth/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Header(): React.JSX.Element {
    const pathname = usePathname();
    const { transactions, isInitialized } = useLedgerStore();
    const { data: session } = useSession();

    const clearedBalance = transactions
        .filter(tx => tx.status === TransactionStatus.Cleared)
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const pendingBalance = transactions
        .filter(tx => tx.status === TransactionStatus.Pending)
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const navItems = [
        { name: 'Ledger', href: '/' },
        { name: 'Accounts', href: '/accounts' },
        { name: 'Payees', href: '/payees' },
        { name: 'Reports', href: '#' },
        { name: 'Settings', href: '/settings' },
    ];

    return (
        <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center group-hover:shadow-[0_0_10px_rgba(56,189,248,0.5)] transition-all">
                            <span className="text-primary-foreground font-black text-xs">P</span>
                        </div>
                        <h1 className="font-bold text-sm tracking-tight uppercase">
                            Path <span className="text-primary">Logic</span>
                        </h1>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map(item => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href as any}
                                    className={cn(
                                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-sm",
                                        isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    )}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Net Position</span>
                        <span className={cn("text-sm font-mono font-bold leading-none", clearedBalance + pendingBalance < 0 ? 'text-destructive' : 'text-emerald-500')}>
                            {Money.formatCurrency(clearedBalance + pendingBalance)}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-sm bg-accent border border-border flex items-center justify-center hover:bg-accent/80 transition-colors">
                                <div className={cn("w-2 h-2 rounded-full", isInitialized ? "bg-emerald-500 animate-pulse" : "bg-muted")}></div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase border-b border-border mb-1">
                                {session?.user?.email || 'User Session'}
                            </div>
                            <DropdownMenuItem className="text-[10px] uppercase font-bold focus:bg-accent cursor-pointer">
                                Profile Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] uppercase font-bold focus:bg-accent cursor-pointer text-destructive">
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
