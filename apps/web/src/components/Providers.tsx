'use client';

import { SessionProvider, signIn } from 'next-auth/react';
import React, { useEffect } from 'react';
import { GDRIVE_AUTH_ERROR_EVENT } from '@/lib/storage/errors';
import { useAutoSync } from '@/hooks/useAutoSync';

function GDriveAuthObserver(): null {
    useEffect((): (() => void) => {
        const handleAuthError = (): void => {
            console.warn('Providers: GDriveAuthError detected. Triggering re-authentication...');
            signIn('google', { callbackUrl: window.location.href });
        };

        window.addEventListener(GDRIVE_AUTH_ERROR_EVENT, handleAuthError);
        return (): void => window.removeEventListener(GDRIVE_AUTH_ERROR_EVENT, handleAuthError);
    }, []);

    return null;
}

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
            <GDriveAuthObserver />
            <AutoSyncObserver />
            {children}
        </SessionProvider>
    );
}
