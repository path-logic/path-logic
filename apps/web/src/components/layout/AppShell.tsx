'use client';

import * as React from 'react';
import { Header } from './Header';
import { cn } from '@/lib/utils';

import { SyncIndicator } from '../sync/SyncIndicator';

interface IAppShellProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Global application shell that provides the consistent header, 
 * Bloomberg-style background, and overflow management.
 */
export function AppShell({ children, className }: IAppShellProps): React.JSX.Element {
    return (
        <div className="h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-hidden flex flex-col">
            <Header />
            <main className={cn("flex-1 max-w-[1600px] mx-auto w-full p-4 flex gap-4 overflow-hidden min-h-0", className)}>
                {children}
            </main>
            <footer className="h-8 border-t border-border bg-background px-4 flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase flex-none">
                <SyncIndicator />
                <div>Environment: Local Engine • v4.2-Alpha</div>
            </footer>
        </div>
    );
}
