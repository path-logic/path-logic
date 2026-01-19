'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { ITransaction } from '@path-logic/core';
import { useLedgerStore } from '@/store/ledgerStore';
import { saveToDrive } from '@/lib/sync/syncService';

/**
 * Hook that automatically syncs ledger changes to Google Drive.
 * Watches for mutations in the ledgerStore and triggers a debounced
 * background upload if a valid session exists.
 */
export function useAutoSync(): void {
    const { data: session }: { data: any } = useSession();
    const transactions: Array<ITransaction> = useLedgerStore((state) => state.transactions);
    const isInitialized: boolean = useLedgerStore((state) => state.isInitialized);

    // Track the previous transactions array to detect actual mutations vs. initial load
    const prevTransactionsRef = useRef<Array<ITransaction>>(transactions);
    const initialLoadDoneRef = useRef<boolean>(false);

    useEffect((): void => {
        // Skip sync if not initialized or no session
        if (!isInitialized || !session?.accessToken || !session?.user?.id) {
            return;
        }

        // Handle initial load - we don't want to sync immediately after downloading/loading the DB
        if (!initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            prevTransactionsRef.current = transactions;
            return;
        }

        // Only sync if data has actually changed (reference check)
        if (transactions !== prevTransactionsRef.current) {
            console.log(`[AutoSync] Detected change in ledger state. Triggering sync...`);

            saveToDrive(session.accessToken, session.user.id).catch((err: unknown): void => {
                console.error('[AutoSync] Background sync failed:', err);
            });

            prevTransactionsRef.current = transactions;
        }
    }, [transactions, session, isInitialized]);
}
