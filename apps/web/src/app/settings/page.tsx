'use client';

import * as React from 'react';
import { StyledFeatureFlagToggle } from '@/components/StyledFeatureFlagToggle';
import { FLAG_CONFIGS } from '@/lib/featureFlags/flags';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Zap } from 'lucide-react';
import type { IFlagConfig } from '@path-logic/feature-flags/components';

export default function SettingsPage(): React.JSX.Element {
    return (
        <AppShell>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
                <header className="flex justify-between items-center flex-none">
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest mb-1 text-primary">
                            System <span className="text-foreground">Settings</span>
                        </h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                            Configure your Path Logic experience and experiment with features
                        </p>
                    </div>
                </header>

                <Card className="flex-1 bg-card border-border rounded-sm overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8">
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="w-4 h-4 text-primary" />
                                    <h2 className="text-[11px] font-black uppercase tracking-widest">Feature Flags</h2>
                                </div>
                                <div className="grid gap-3">
                                    {Object.values(FLAG_CONFIGS).map((config: IFlagConfig): React.JSX.Element => (
                                        <div key={config.key} className="bg-muted/20 border border-border/50 rounded-sm p-1 transition-colors hover:border-primary/30">
                                            <StyledFeatureFlagToggle
                                                flag={config.key}
                                                label={config.name}
                                                description={config.description}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-4 h-4 text-primary" />
                                    <h2 className="text-[11px] font-black uppercase tracking-widest">Application Info</h2>
                                </div>
                                <div className="bg-muted/20 border border-border/50 rounded-sm p-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase">
                                            <span className="text-muted-foreground">Version</span>
                                            <span className="text-foreground">4.2-Alpha</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase">
                                            <span className="text-muted-foreground">Engine</span>
                                            <span className="text-foreground text-emerald-500">Local-First WASM SQLite</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase">
                                            <span className="text-muted-foreground">Encryption</span>
                                            <span className="text-foreground text-emerald-500">AES-GCM (Hardware Accelerated)</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </AppShell>
    );
}
