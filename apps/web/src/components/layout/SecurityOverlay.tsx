'use client';

import React from 'react';
import { Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ISecurityOverlayProps {
    isVisible: boolean;
    onUnlock: () => void;
}

/**
 * Premium security overlay that blurs the screen when the session is idle.
 * Prevents unauthorized viewing of PII (Personally Identifiable Information).
 */
export function SecurityOverlay({ isVisible, onUnlock }: ISecurityOverlayProps): React.JSX.Element {
    if (!isVisible) return <></>;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] flex items-center justify-center bg-background/40 backdrop-blur-xl transition-all duration-500 ease-in-out",
                isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
        >
            <div
                className={cn(
                    "max-w-md w-full mx-4 p-8 rounded-3xl border border-border bg-card/80 shadow-2xl backdrop-blur-md text-center transform transition-all duration-500 delay-75 ease-out",
                    isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
                )}
            >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/20">
                    <Lock className="w-8 h-8 text-primary shadow-sm" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight mb-2">Session Paused</h2>
                <p className="text-muted-foreground text-sm mb-8 px-4 leading-relaxed">
                    Your session has been paused due to inactivity to protect your financial data.
                </p>

                <div className="space-y-3">
                    <Button
                        onClick={onUnlock}
                        className="w-full h-12 rounded-xl text-md font-semibold group flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                    >
                        Resume Session
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>

                    <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                        <ShieldAlert className="w-3 h-3" />
                        Secure Local-First Environment
                    </div>
                </div>
            </div>
        </div>
    );
}
