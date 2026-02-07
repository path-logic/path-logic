'use client';

import * as React from 'react';
import { useLedgerStore } from '@/store/ledgerStore';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Lock, Monitor } from 'lucide-react';
import { forceReleaseSyncLock, refreshLockStatus } from '@/lib/sync/syncService';
import { getClientId } from '@/lib/storage/SQLiteAdapter';
import { cn } from '@/lib/utils';

/**
 * LockManager component provides visibility into GDrive sync locks.
 * Displays which device holds the lock and allows forceful release.
 */
export function LockManager(): React.JSX.Element | null {
    const { data: session } = useSession();
    const lockStatus = useLedgerStore(state => state.lockStatus);
    const [isReleasing, setIsReleasing] = React.useState(false);

    if (!session?.user) return null;

    const handleForceUnlock = async (): Promise<void> => {
        if (!session.accessToken) return;
        setIsReleasing(true);
        try {
            await forceReleaseSyncLock(session.accessToken as string);
        } catch (error) {
            console.error('Failed to force unlock', error);
        } finally {
            setIsReleasing(false);
        }
    };

    const handleRefresh = async (): Promise<void> => {
        if (!session.accessToken) return;
        await refreshLockStatus(session.accessToken as string);
    };

    if (!lockStatus) return null;

    const isOurLock = lockStatus.clientId === getClientId();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition-colors h-5',
                        isOurLock
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500',
                    )}
                    onClick={handleRefresh}
                >
                    <Lock className="w-2.5 h-2.5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">
                        {isOurLock ? 'Remote Locked (Me)' : 'Remote Locked'}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0 rounded-sm border-2 animate-in fade-in zoom-in-95 duration-200"
                align="end"
                side="top"
            >
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Monitor className="w-4 h-4 text-primary" />
                        <h4 className="font-black uppercase tracking-tighter text-xs">
                            Active Sync Lock
                        </h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Another device is currently merging data. To prevent corruption, GDrive is
                        in read-only mode for other sessions.
                    </p>
                </div>

                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                        <div>
                            <span className="block text-muted-foreground uppercase mb-0.5 text-[8px] font-bold">
                                Device
                            </span>
                            <span className="font-bold text-foreground truncate block">
                                {lockStatus.deviceName}
                            </span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground uppercase mb-0.5 text-[8px] font-bold">
                                Status
                            </span>
                            <span className="font-bold text-primary uppercase">
                                {lockStatus.status}
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-muted-foreground uppercase mb-0.5 text-[8px] font-bold">
                                Expires
                            </span>
                            <span className="font-bold text-foreground">
                                {new Date(lockStatus.expiresAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false,
                                })}
                            </span>
                        </div>
                    </div>

                    {!isOurLock && (
                        <div className="pt-2 border-t border-border/50">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full h-8 text-[10px] font-black uppercase rounded-sm"
                                onClick={handleForceUnlock}
                                disabled={isReleasing}
                            >
                                {isReleasing ? 'Releasing...' : 'Force Release Lock'}
                            </Button>
                            <p className="mt-2 text-[9px] text-destructive/80 leading-tight italic text-center">
                                CAUTION: Forces release. May cause data collisions.
                            </p>
                        </div>
                    )}

                    {isOurLock && (
                        <div className="pt-2 border-t border-border/50">
                            <p className="text-[9px] text-primary/80 leading-tight italic text-center">
                                You hold this lock. It will release automatically when your merge is
                                complete.
                            </p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
