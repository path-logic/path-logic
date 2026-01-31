'use client';

import * as React from 'react';
import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLedgerStore } from '@/store/ledgerStore';
import { AccountEditForm } from '@/components/accounts/AccountEditForm';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Info } from 'lucide-react';

interface IAccountInfoPageProps {
    params: Promise<{ accountId: string }>;
}

export default function AccountInfoPage({ params }: IAccountInfoPageProps): React.JSX.Element {
    const { accountId } = use(params);
    const router = useRouter();
    const { accounts, isInitialized, initialize, updateAccount } = useLedgerStore();

    useEffect((): void => {
        if (!isInitialized) {
            initialize();
        }
    }, [isInitialized, initialize]);

    const account = useMemo(() => {
        return accounts.find(acc => acc.id === accountId) || null;
    }, [accountId, accounts]);

    useEffect((): void => {
        if (isInitialized && !account) {
            router.push('/accounts');
        }
    }, [isInitialized, account, router]);

    if (!account) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="p-0 h-8 w-8 hover:bg-muted"
                    >
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Info className="w-3.5 h-3.5 text-primary" />
                            <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
                                Account <span className="text-primary">Details</span>
                            </h1>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                            Configure metadata and historical balance adjustments for {account.name}
                        </p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-sm overflow-hidden shadow-xl">
                    <div className="p-8">
                        <AccountEditForm
                            account={account}
                            onCancel={() => router.back()}
                            onSubmit={async updated => {
                                await updateAccount(updated);
                                router.back();
                            }}
                        />
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
