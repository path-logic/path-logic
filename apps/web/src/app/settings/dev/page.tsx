import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ArrowRight, Database, AlertTriangle, Shield } from 'lucide-react';

export default function DevIndexPage(): React.ReactElement {
    return (
        <div className="space-y-12">
            <header className="flex justify-between items-end border-b border-border/30 pb-8">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-[0.2em] mb-2 text-primary">
                        Developer <span className="text-foreground">Tools</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">
                        Internal system diagnostics and architectural validation
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sync Test Suite */}
                <Link href="/settings/dev/sync-test" className="group">
                    <Card interactive accentColor="bg-blue-500" className="p-8 h-full">
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Database className="w-6 h-6 text-blue-500" />
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                                    Sync Test Suite
                                </h2>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-bold opacity-60">
                                    Full-cycle validation of the Path Logic storage architecture:
                                    SQLite WASM → E2E Encryption → Cloud Providers.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
                                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-500/70 px-2 py-1 rounded">
                                    SQLite
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/5 text-purple-500/70 px-2 py-1 rounded">
                                    AES-GCM
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500/70 px-2 py-1 rounded">
                                    Cloud Sync
                                </span>
                            </div>
                        </div>
                    </Card>
                </Link>

                {/* Auth Diagnostics */}
                <Link href="/settings/dev/auth" className="group">
                    <Card interactive accentColor="bg-emerald-500" className="p-8 h-full">
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                    <Shield className="w-6 h-6 text-emerald-500" />
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                                    Auth Diagnostics
                                </h2>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-bold opacity-60">
                                    OAuth2 session validation, token metadata inspection, and manual
                                    auth state simulation for reconnection testing.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
                                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500/70 px-2 py-1 rounded">
                                    Google OAuth
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-500/70 px-2 py-1 rounded">
                                    NextAuth
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/5 text-amber-500/70 px-2 py-1 rounded">
                                    Session Simulation
                                </span>
                            </div>
                        </div>
                    </Card>
                </Link>

                {/* System Maintenance */}
                <Link href="/settings/dev/maintenance" className="group">
                    <Card interactive accentColor="bg-rose-500" className="p-8 h-full">
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                    <AlertTriangle className="w-6 h-6 text-rose-500" />
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                                    System Maintenance
                                </h2>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-bold opacity-60">
                                    Environment-level data destruction and low-level entity
                                    management for state recovery or manual clearing.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
                                <span className="text-[9px] font-black uppercase tracking-widest bg-rose-500/5 text-rose-500/70 px-2 py-1 rounded">
                                    Factory Reset
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/5 text-indigo-500/70 px-2 py-1 rounded">
                                    DB Explorer
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-orange-500/5 text-orange-500/70 px-2 py-1 rounded">
                                    High-Risk
                                </span>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            <section className="mt-12">
                <Card className="p-6 bg-amber-500/5 border-amber-500/20">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-500">
                                Security Requirement
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60 leading-relaxed">
                                These tools access the encrypted domain layer. Ensure the
                                &quot;Developer Tools&quot; flag is disabled in production
                                environments.
                            </p>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
}
