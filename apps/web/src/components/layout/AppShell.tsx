'use client';

import * as React from 'react';
import { Header } from './Header';
import { cn } from '@/lib/utils';

import { useSecurityManager } from '@/hooks/useSecurityManager';
import { SecurityOverlay } from './SecurityOverlay';
import { BreadcrumbNav } from './BreadcrumbNav';
import { Footer } from './Footer';
import { AuthOverlay, SyncPendingBanner } from '../auth/AuthOverlay';

interface IAppShellProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    scrollable?: boolean;
}

/**
 * Global application shell that provides the consistent header,
 * Bloomberg-style background, and overflow management.
 */
export function AppShell({
    children,
    className,
    noPadding = false,
    scrollable = true,
}: IAppShellProps): React.JSX.Element {
    const { isIdle, unlock } = useSecurityManager();

    return (
        <div className="h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-hidden flex flex-col relative">
            <SecurityOverlay isVisible={isIdle} onUnlock={unlock} />
            <AuthOverlay />
            <SyncPendingBanner />
            <Header />
            <main className={cn('flex-1 w-full flex flex-col min-h-0 relative', className)}>
                <div className="flex-none w-full border-b border-border/50 bg-background/50 backdrop-blur-sm px-4">
                    <div className="max-w-7xl mx-auto py-2">
                        <BreadcrumbNav />
                    </div>
                </div>

                <div
                    className={cn(
                        'flex-1 w-full flex flex-col',
                        scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
                    )}
                >
                    <div
                        className={cn(
                            'w-full mx-auto flex flex-col',
                            !noPadding && 'p-4 max-w-7xl',
                            scrollable ? 'min-h-full' : 'h-full',
                        )}
                    >
                        {children}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
