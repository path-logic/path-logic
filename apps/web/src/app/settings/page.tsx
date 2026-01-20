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
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                <div className="flex-1 overflow-auto p-8">
                    <div className="mx-auto max-w-7xl w-full space-y-8">
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

                        <section className="space-y-6">
                            <div className="flex items-center gap-2 px-1">
                                <Shield className="w-4 h-4 text-primary" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Feature Flags</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.values(FLAG_CONFIGS).map((config: IFlagConfig): React.JSX.Element => (
                                    <Card key={config.key} className="py-0 border-border/40 overflow-hidden">
                                        <StyledFeatureFlagToggle
                                            flag={config.key}
                                            label={config.name}
                                            description={config.description}
                                        />
                                    </Card>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-2 px-1">
                                <Zap className="w-4 h-4 text-primary" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Application Info</h2>
                            </div>
                            <Card className="p-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Version</span>
                                        <span className="text-[11px] font-black uppercase text-foreground">4.2-Alpha</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Engine</span>
                                        <span className="text-[11px] font-black uppercase text-emerald-500">Local-First WASM SQLite</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Encryption</span>
                                        <span className="text-[11px] font-black uppercase text-emerald-500">AES-GCM (Hardware Accelerated)</span>
                                    </div>
                                </div>
                            </Card>
                        </section>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
