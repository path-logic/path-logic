'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLedgerStore } from '@/store/ledgerStore';
import { loadFromDrive, saveToDrive } from '@/lib/sync/syncService';

/**
 * Global Manager that orchestrates the data lifecycle:
 * 1. Initial Load: Downloads from GDrive (or Local Fallback) when session is ready.
 * 2. Auto-Sync: Watches for 'isDirty' changes and uploads to GDrive (debounced).
 */
export function SyncManager(): null {
    const { data: session } = useSession();
    const isInitialized = useLedgerStore(state => state.isInitialized);
    const isDirty = useLedgerStore(state => state.isDirty);

    const initialLoadAttempted = useRef<boolean>(false);
    const lastSyncDirtyState = useRef<boolean>(false);

    // 1. Handle Initial Load
    useEffect(() => {
        // We only want to trigger this once when the session is ready
        if (initialLoadAttempted.current) return;

        const accessToken = session?.accessToken as string | undefined;
        const userId = session?.user?.id;

        console.log('[SyncManager] Checking initial load state...', {
            hasSession: !!session,
            isInitialized,
            initialLoadAttempted: initialLoadAttempted.current,
        });

        void loadFromDrive(accessToken || '', userId || 'anonymous')
            .then(() => {
                console.log('[SyncManager] Initial load sequence complete');
            })
            .catch(err => {
                console.error('[SyncManager] Initial load failed:', err);
            })
            .finally(() => {
                initialLoadAttempted.current = true;
            });
    }, [session, isInitialized]);

    // 2. Handle Auto-Sync on Mutation
    useEffect(() => {
        const accessToken = session?.accessToken as string | undefined;
        const userId = session?.user?.id;

        // Skip if not ready
        if (!isInitialized || !accessToken || !userId) return;

        // Reactive trigger: when shifted from not-dirty to dirty
        if (isDirty && !lastSyncDirtyState.current) {
            console.log('[SyncManager] Store marked as DIRTY. Triggering cloud sync...');

            saveToDrive(accessToken, userId).catch(err => {
                console.error('[SyncManager] Periodic sync failed:', err);
            });

            lastSyncDirtyState.current = true;
        }

        // Reset tracking if dirty is cleared elsewhere
        if (!isDirty) {
            lastSyncDirtyState.current = false;
        }
    }, [isDirty, isInitialized, session]);

    return null;
}
