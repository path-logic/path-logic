'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import { useAutoSync } from '@/hooks/useAutoSync';

/**
 * Global observer that triggers background sync whenever ledger state changes.
 */
function AutoSyncObserver(): null {
    useAutoSync();
    return null;
}

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <SessionProvider>
            <AutoSyncObserver />
            {children}
        </SessionProvider>
    );
}
