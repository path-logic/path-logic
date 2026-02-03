'use client';

import { type ITransaction, Money, TransactionStatus } from '@path-logic/core';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import * as React from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLedgerStore } from '@/store/ledgerStore';

export function Header(): React.JSX.Element {
    const pathname: string | null = usePathname();
    const { transactions } = useLedgerStore();
    const { data: session } = useSession();

    const clearedBalance: number = transactions
        .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Cleared)
        .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

    const pendingBalance: number = transactions
        .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Pending)
        .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);

    interface INavItem {
        name: string;
        href: string;
    }

    const navItems: Array<INavItem> = [
        { name: 'Overview', href: '/' },
        { name: 'Accounts', href: '/accounts' },
        { name: 'Payees', href: '/payees' },
        { name: 'Reports', href: '#' },
        { name: 'Settings', href: '/settings' },
    ];

    return (
        <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
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
                        {navItems.map((item: INavItem): React.JSX.Element => {
                            const isActive: boolean =
                                pathname === item.href ||
                                (item.href !== '/' && !!pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-sm',
                                        isActive
                                            ? 'text-primary bg-primary/10'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
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
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                            Net Position
                        </span>
                        <span
                            className={cn(
                                'text-sm font-mono font-bold leading-none',
                                clearedBalance + pendingBalance < 0
                                    ? 'text-destructive'
                                    : 'text-emerald-500',
                            )}
                        >
                            {Money.formatCurrency(clearedBalance + pendingBalance)}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                                {session?.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || 'User'}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-primary flex items-center justify-center">
                                        <span className="text-primary-foreground font-bold text-xs">
                                            {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border w-56">
                            <div className="flex items-center gap-3 px-3 py-2 border-b border-border mb-1">
                                {session?.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || 'User'}
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 rounded-full object-cover border border-border"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                        <span className="text-primary-foreground font-bold text-sm">
                                            {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-bold text-foreground truncate">
                                        {session?.user?.name || 'User'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground truncate">
                                        {session?.user?.email || ''}
                                    </span>
                                </div>
                            </div>
                            <DropdownMenuItem className="text-[10px] uppercase font-bold focus:bg-accent cursor-pointer">
                                Profile Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(): void => {
                                    void signOut({ callbackUrl: '/' });
                                }}
                                className="text-[10px] uppercase font-bold focus:bg-accent cursor-pointer text-destructive"
                            >
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
