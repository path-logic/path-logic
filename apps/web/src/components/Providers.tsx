'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import { SyncManager } from '@/components/sync/SyncManager';

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <SessionProvider>
            <SyncManager />
            {children}
        </SessionProvider>
    );
}
