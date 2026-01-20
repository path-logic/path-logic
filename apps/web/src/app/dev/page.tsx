import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ArrowRight, Code, Database, AlertTriangle } from 'lucide-react';

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
                <Link href="/dev/sync-test" className="group">
                    <Card interactive accentColor="bg-blue-500" className="p-8 h-full">
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Database className="w-6 h-6 text-blue-500" />
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Sync Test Suite</h2>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-bold opacity-60">
                                    Full-cycle validation of the Path Logic storage architecture: SQLite WASM → E2E Encryption → Cloud Providers.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
                                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-500/70 px-2 py-1 rounded">SQLite</span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/5 text-purple-500/70 px-2 py-1 rounded">AES-GCM</span>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500/70 px-2 py-1 rounded">Cloud Sync</span>
                            </div>
                        </div>
                    </Card>
                </Link>

                {/* Coming Soon Placeholder */}
                <Card className="p-8 border-dashed border-border/50 bg-muted/5 flex items-center justify-center text-center opacity-40">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-muted/20 mx-auto flex items-center justify-center">
                            <Code className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">More Tools In Progress</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Architectural Hooks & Log Spies</p>
                        </div>
                    </div>
                </Card>
            </div>

            <section className="mt-12">
                <Card className="p-6 bg-amber-500/5 border-amber-500/20">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-500">Security Requirement</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60 leading-relaxed">
                                These tools access the encrypted domain layer. Ensure the &quot;Developer Tools&quot; flag is disabled in production environments.
                            </p>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
}
