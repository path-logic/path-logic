'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';
import { Button } from '@/components/ui/button';
import { Cloud, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Full-page overlay for forced re-authentication.
 * Used when the session is expired and there is no local fallback to work with.
 */
export function AuthOverlay(): React.JSX.Element | null {
    const authError: boolean = useLedgerStore((state): boolean => state.authError);
    const isInitialized: boolean = useLedgerStore((state): boolean => state.isInitialized);
    const hasLocalFallback: boolean = useLedgerStore((state): boolean => state.hasLocalFallback);

    // We only show the full-page overlay if we can't initialize at all
    const showOverlay: boolean = authError && !isInitialized && !hasLocalFallback;

    if (!showOverlay) return null;

    const handleLogin = (): void => {
        void signIn('google');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="max-w-md w-full space-y-8">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                    <div className="relative w-16 h-16 bg-card border-2 border-primary rounded-sm shadow-2xl flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                        Session <span className="text-primary">Expired</span>
                    </h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">
                        Authentication with Google Drive is required to continue
                    </p>
                </div>

                <div className="p-4 bg-muted/30 border border-border rounded-lg text-left space-y-3">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-foreground">
                                End-to-End Encrypted
                            </p>
                            <p className="text-[9px] text-muted-foreground leading-normal">
                                Your financial data is encrypted locally BEFORE it leaves your
                                browser. Path Logic never sees your raw data.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Cloud className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-foreground">
                                User-Owned Storage
                            </p>
                            <p className="text-[9px] text-muted-foreground leading-normal">
                                Data is stored exclusively in your own Google Drive (App Data
                                folder), giving you complete ownership.
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleLogin}
                    size="lg"
                    className="w-full font-black uppercase tracking-widest gap-2 py-6 text-sm"
                >
                    <Lock className="w-4 h-4" /> Re-authenticate Session
                </Button>

                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                    Requires Google Drive Access (appDataFolder scope)
                </p>
            </div>
        </div>
    );
}

/**
 * Mid-session warning banner for when sync is purely local.
 */
export function SyncPendingBanner(): React.JSX.Element | null {
    const authError: boolean = useLedgerStore((state): boolean => state.authError);
    const isDirty: boolean = useLedgerStore((state): boolean => state.isDirty);
    const syncStatus: string = useLedgerStore((state): string => state.syncStatus);

    // Show if we have data (isDirty or pending-local) but session is lost
    const showBanner: boolean = authError && (isDirty || syncStatus === 'pending-local');

    if (!showBanner) return null;

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                    Cloud Connection Lost • Changes saved to browser cache only
                </span>
            </div>
            <p className="text-[8px] text-amber-600/70 font-mono uppercase">Offline Mode Enabled</p>
        </div>
    );
}
