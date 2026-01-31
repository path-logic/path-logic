'use client';

import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { getSyncStatus } from '@/lib/sync/syncService';
import { cn } from '@/lib/utils';
import { Cloud, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import { Button } from '@/components/ui/button';

/**
 * Global indicator for Google Drive sync status.
 * Visualizes when the app is in-progress, idle, or has encountered an error.
 */
export function SyncIndicator(): React.JSX.Element {
    const authError = useLedgerStore(state => state.authError);
    const { update: updateSession } = useSession();
    const [status, setStatus] = useState(getSyncStatus());

    useEffect(() => {
        const handleAuthMessage = async (event: MessageEvent): Promise<void> => {
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'PATH_LOGIC_AUTH_SUCCESS') {
                console.log('Auth success message received!');
                await updateSession(); // Refresh the session
                useLedgerStore.setState({ authError: false }); // Clear error
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
            // NextAuth v5 requires POST for signin, so we can't just window.open the API route.
            // We use signIn with redirect: false to get the OAuth URL.
            // Note: We might need to handle the popup/redirect manually or let generic signIn handle it if we didn't want a popup.
            // But user specifically wants a popup to preserve state.

            // To properly do a popup flow with NextAuth v5 is tricky because signIn() with redirect:false
            // returns the *final* callback URL or valid redirect, but for OAuth it returns the Provider URL?
            // Let's test if we can get the provider URL.
            // Actually, normally 'signIn' automatically redirects.
            // If we want a popup, the standard way is to open a window that *calls* signIn, or
            // open a window to a custom page that calls signIn.
            //
            // However, sticking to the strategy:
            // If we use signIn('google', { redirect: false }), it should return { url: 'https://accounts.google.com...' }
            // Let's try that.

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
        const interval: NodeJS.Timeout = setInterval((): void => {
            const currentStatus = getSyncStatus();
            setStatus(prev => {
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

    const isSyncing: boolean = status.inProgress;

    return (
        <div className="flex items-center gap-4 text-[9px] font-mono text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5">
                <div className="relative flex items-center justify-center">
                    {!authError && (
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
                </div>
                <span className="flex items-center gap-1">
                    {authError ? (
                        <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                    ) : isSyncing ? (
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                        <Cloud className="w-2.5 h-2.5" />
                    )}
                    Cloud Sync: {authError ? 'Action Required' : isSyncing ? 'Active...' : 'Idle'}
                </span>
            </div>

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

            {status.lastSyncTime > 0 && (
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
