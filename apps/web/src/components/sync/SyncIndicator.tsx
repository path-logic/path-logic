'use client';

import React, { useEffect, useState } from 'react';
import { getSyncStatus } from '@/lib/sync/syncService';
import { cn } from '@/lib/utils';
import { Cloud, RefreshCw } from 'lucide-react';

/**
 * Global indicator for Google Drive sync status.
 * Visualizes when the app is in-progress, idle, or has encountered an error.
 */
export function SyncIndicator(): React.JSX.Element {
    const [status, setStatus] = useState(getSyncStatus());

    useEffect((): (() => void) => {
        const interval: NodeJS.Timeout = setInterval((): void => {
            const currentStatus = getSyncStatus();
            setStatus((prev) => {
                if (prev.inProgress === currentStatus.inProgress &&
                    prev.lastSyncTime === currentStatus.lastSyncTime) {
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
                    <div
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSyncing ? "bg-primary animate-pulse" : "bg-emerald-500"
                        )}
                    />
                    {isSyncing && (
                        <div className="absolute w-3 h-3 border border-primary/30 rounded-full animate-ping" />
                    )}
                </div>
                <span className="flex items-center gap-1">
                    {isSyncing ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Cloud className="w-2.5 h-2.5" />}
                    Cloud Sync: {isSyncing ? 'Active...' : 'Idle'}
                </span>
            </div>

            {status.lastSyncTime > 0 && (
                <span className="hidden sm:inline border-l border-border pl-4">
                    Last Backup: {new Date(status.lastSyncTime).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })}
                </span>
            )}
        </div>
    );
}
