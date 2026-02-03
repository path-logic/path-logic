'use client';

import { signIn, useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useLedgerStore } from '@/store/ledgerStore';
import { Card } from '@/components/ui/card';
import { Shield, Key, LogOut, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Developer tool for testing Google Drive authentication and session management.
 * Allows simulating various auth states to test the reconnection flow.
 */
export default function DevAuthPage(): React.ReactElement {
    const { data: session, status } = useSession();
    const setAuthError = useLedgerStore(state => state.setAuthError);
    const authError = useLedgerStore(state => state.authError);

    return (
        <div className="space-y-12">
            <header className="flex justify-between items-end border-b border-border/30 pb-8">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-[0.2em] mb-2 text-primary">
                        Auth <span className="text-foreground">Diagnostics</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">
                        OAuth2 Flow Validation & Session State Simulation
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Connection Status Card */}
                <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest">
                            Session Status
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                            <span className="opacity-40">NextAuth Status:</span>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded',
                                    status === 'authenticated'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-amber-500/10 text-amber-500',
                                )}
                            >
                                {status}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                            <span className="opacity-40">Store Auth Error:</span>
                            <span className={authError ? 'text-destructive' : 'text-emerald-500'}>
                                {authError ? 'RECONNECT_REQUIRED' : 'VALID'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Account Details */}
                <Card className="p-6 md:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Key className="w-4 h-4 text-blue-500" />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest">
                            Token Metadata
                        </h2>
                    </div>

                    <pre className="p-4 bg-muted/30 rounded text-[9px] font-mono max-h-[120px] overflow-auto border border-border/10">
                        {JSON.stringify(session, null, 2)}
                    </pre>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Action Suite */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        Actions
                    </h3>
                    <Card className="p-6 grid grid-cols-1 gap-4">
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => signIn('google')}>
                                Sign in
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => signIn('google', { prompt: 'consent' })}
                            >
                                Force Consent
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => signOut()}>
                                <LogOut className="w-3 h-3 mr-2" />
                                End Session
                            </Button>
                        </div>
                        <div className="pt-4 border-t border-border/10 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setAuthError(true)}
                            >
                                Simulate Expired Session
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setAuthError(false)}
                            >
                                <CheckCircle2 className="w-3 h-3 mr-2 text-emerald-500" />
                                Reset Error State
                            </Button>
                        </div>
                    </Card>
                </section>

                {/* Documentation / Instructions */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        Validation Procedure
                    </h3>
                    <Card className="p-6 bg-muted/10 border-dashed">
                        <ul className="text-[10px] font-bold uppercase tracking-widest space-y-3 opacity-60">
                            <li className="flex items-start gap-3">
                                <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] flex-shrink-0">
                                    1
                                </span>
                                <span>
                                    Click &quot;Simulate Expired Session&quot; to trigger
                                    client-side failure mode.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] flex-shrink-0">
                                    2
                                </span>
                                <span>
                                    Verify that the status bar indicates &quot;Action
                                    Required&quot;.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] flex-shrink-0">
                                    3
                                </span>
                                <span>
                                    Click the reconnect button in status bar and confirm popup
                                    behavior.
                                </span>
                            </li>
                        </ul>
                    </Card>
                </section>
            </div>
        </div>
    );
}
