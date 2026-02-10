'use client';

import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { getSyncStatus, refreshLockStatus, type ISyncStatus } from '@/lib/sync/syncService';
import { cn } from '@/lib/utils';
import { Cloud, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import { Button } from '@/components/ui/button';
import { LockManager } from './LockManager';
import type { TimerHandle } from '@path-logic/core';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * Global indicator for Google Drive sync status.
 * Visualizes when the app is in-progress, idle, or has encountered an error.
 */
export function SyncIndicator(): React.JSX.Element {
    const authError = useLedgerStore((state): boolean => state.authError);
    const syncStatus = useLedgerStore((state): string => state.syncStatus);
    const hasLocalFallback = useLedgerStore((state): boolean => state.hasLocalFallback);
    const { data: session, update: updateSession } = useSession();
    const [status, setStatus] = useState<ISyncStatus>(getSyncStatus());
    const isMounted = useIsMounted();

    useEffect((): (() => void) => {
        const handleAuthMessage = async (event: MessageEvent): Promise<void> => {
            if (event.origin !== window.location.origin) return;

            if (
                event.data &&
                typeof event.data === 'object' &&
                (event.data as { type?: string }).type === 'PATH_LOGIC_AUTH_SUCCESS'
            ) {
                console.log('Auth success message received!');
                await updateSession(); // Refresh the session
                useLedgerStore.getState().setAuthError(false); // Clear error
            }
        };

        window.addEventListener('message', handleAuthMessage);
        return (): void => window.removeEventListener('message', handleAuthMessage);
    }, [updateSession]);

    const handleReconnect = async (): Promise<void> => {
        // Open sign-in in a popup to preserve in-memory state
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        try {
            const result = await signIn('google', {
                redirect: false,
                callbackUrl: `${window.location.origin}/auth-success`,
            });

            if (result?.url) {
                window.open(
                    result.url,
                    'PathLogicAuth',
                    `width=${width},height=${height},left=${left},top=${top}`,
                );
            }
        } catch (error) {
            console.error('Reconnect failed', error);
        }
    };

    useEffect((): (() => void) => {
        const interval: TimerHandle = setInterval((): void => {
            const currentStatus = getSyncStatus();
            setStatus((prev: ISyncStatus): ISyncStatus => {
                if (
                    prev.inProgress === currentStatus.inProgress &&
                    prev.lastSyncTime === currentStatus.lastSyncTime
                ) {
                    return prev;
                }
                return currentStatus;
            });
        }, 500);

        return (): void => clearInterval(interval);
    }, []);

    // Poll for lock status every 30 seconds
    useEffect((): (() => void) | undefined => {
        if (session?.accessToken) {
            refreshLockStatus(session.accessToken as string);
            const interval: TimerHandle = setInterval((): void => {
                refreshLockStatus(session.accessToken as string);
            }, 30000);
            return (): void => clearInterval(interval);
        }
        return undefined;
    }, [session?.accessToken]);

    const isSyncing: boolean = status.inProgress;

    return (
        <div className="flex items-center gap-4 text-[9px] font-mono text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5">
                <div className="relative flex items-center justify-center">
                    {syncStatus === 'synced' && !authError && (
                        <>
                            <div
                                className={cn(
                                    'w-1.5 h-1.5 rounded-full',
                                    isSyncing ? 'bg-primary animate-pulse' : 'bg-emerald-500',
                                )}
                            />
                            {isSyncing && (
                                <div className="absolute w-3 h-3 border border-primary/30 rounded-full animate-ping" />
                            )}
                        </>
                    )}
                    {(syncStatus === 'pending-local' || (authError && hasLocalFallback)) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    {syncStatus === 'error' && !hasLocalFallback && (
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    )}
                </div>
                <span className="flex items-center gap-1">
                    {syncStatus === 'error' ? (
                        <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                    ) : syncStatus === 'pending-local' ? (
                        <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin" />
                    ) : isSyncing ? (
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                        <Cloud className="w-2.5 h-2.5" />
                    )}
                    Cloud Sync:{' '}
                    {syncStatus === 'error'
                        ? 'Sync Error'
                        : syncStatus === 'pending-local'
                          ? 'Local Only'
                          : isSyncing
                            ? 'Active...'
                            : 'Idle'}
                </span>
            </div>

            <LockManager />

            {authError && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-[8px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors uppercase font-bold"
                    onClick={handleReconnect}
                >
                    Reconnect Drive
                </Button>
            )}

            {isMounted && status.lastSyncTime > 0 && (
                <span className="hidden sm:inline border-l border-border pl-4">
                    Last Backup:{' '}
                    {new Date(status.lastSyncTime).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })}
                </span>
            )}
        </div>
    );
}
