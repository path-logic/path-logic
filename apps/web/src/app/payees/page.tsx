'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';
import { type IPayee } from '@path-logic/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronDown, ChevronRight, User, MapPin, Globe, Phone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignInButton } from '@/components/auth/SignInButton';
import { AppShell } from '@/components/layout/AppShell';

export default function PayeesPage(): React.JSX.Element {
    const { data: session }: { data: any; status: string } = useSession();
    const { payees, isInitialized, initialize }: { payees: Array<IPayee>; isInitialized: boolean; initialize: () => Promise<void> } = useLedgerStore();
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    React.useEffect((): void => {
        if (session && !isInitialized) {
            initialize();
        }
    }, [session, isInitialized, initialize]);

    if (!session) return <SignInButton />;

    return (
        <AppShell>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
                <header className="flex justify-between items-center flex-none">
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest mb-1 text-primary">
                            Payee <span className="text-foreground">Directory</span>
                        </h1>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                            Manage spenders and recipients with geographical tracking
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase h-8 border-primary/20 text-primary hover:bg-primary/10">
                        <Plus className="w-3.5 h-3.5 mr-2" /> Add Payee
                    </Button>
                </header>

                <Card className="flex-1 bg-card border-border rounded-sm overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-2">
                            {payees.length === 0 ? (
                                <div className="border border-dashed border-border p-12 text-center rounded-sm">
                                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">No payees registered yet</p>
                                </div>
                            ) : (
                                payees.map((payee: IPayee) => (
                                    <div
                                        key={payee.id}
                                        className={cn(
                                            "transition-all overflow-hidden border rounded-sm",
                                            expandedId === payee.id
                                                ? "bg-accent/40 border-primary/50 shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                                                : "bg-transparent border-border/50 hover:border-primary/30"
                                        )}
                                    >
                                        <div
                                            className="p-3 flex items-center justify-between cursor-pointer select-none h-14"
                                            onClick={(): void => setExpandedId(expandedId === payee.id ? null : payee.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-sm flex items-center justify-center transition-colors shadow-inner",
                                                    expandedId === payee.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                )}>
                                                    <User className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-[11px] font-black uppercase tracking-tight">{payee.name}</h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {payee.city && (
                                                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                                                                <MapPin className="w-2.5 h-2.5" /> {payee.city}, {payee.state}
                                                            </span>
                                                        )}
                                                        {payee.defaultCategoryId && (
                                                            <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm border border-primary/20 font-bold uppercase tracking-tighter">
                                                                {payee.defaultCategoryId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {expandedId === payee.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                                            </div>
                                        </div>

                                        {expandedId === payee.id && (
                                            <div className="px-14 pb-4 pt-0 border-t border-border/50 animate-in slide-in-from-top-1">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                                                    <div>
                                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2 flex items-center gap-2 tracking-widest">
                                                            <MapPin className="w-3 h-3" /> Location
                                                        </p>
                                                        <div className="space-y-1 text-[10px] font-bold uppercase">
                                                            <p className="text-foreground">{payee.address || 'No address provided'}</p>
                                                            {payee.city && <p className="text-foreground">{payee.city}, {payee.state} {payee.zipCode}</p>}
                                                            {payee.latitude && (
                                                                <p className="font-mono text-primary text-[9px] tracking-normal">{payee.latitude}, {payee.longitude}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2 flex items-center gap-2 tracking-widest">
                                                            <Globe className="w-3 h-3" /> Contact & Info
                                                        </p>
                                                        <div className="space-y-1 text-[10px] font-bold uppercase">
                                                            <p className="flex items-center gap-2">
                                                                <Globe className="w-2.5 h-2.5 text-muted-foreground/50" />
                                                                {payee.website ? <a href="#" className="hover:text-primary underline">Website</a> : <span className="text-muted-foreground/50">No website</span>}
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <Phone className="w-2.5 h-2.5 text-muted-foreground/50" />
                                                                {payee.phone || <span className="text-muted-foreground/50">No phone</span>}
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <FileText className="w-2.5 h-2.5 text-muted-foreground/50" />
                                                                <span className="italic font-normal lowercase">{payee.notes || 'No notes'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col justify-end gap-2">
                                                        <Button variant="outline" size="sm" className="text-[9px] uppercase font-black h-7">
                                                            Edit Payee
                                                        </Button>
                                                        <Button size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary text-[9px] uppercase font-black h-7 border border-primary/20">
                                                            Transaction History
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </AppShell>
    );
}
