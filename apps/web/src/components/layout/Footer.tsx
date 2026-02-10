'use client';

import * as React from 'react';
import { SyncIndicator } from '../sync/SyncIndicator';
import { useIsMounted } from '@/hooks/useIsMounted';

export function Footer(): React.JSX.Element {
    const isMounted = useIsMounted();
    const env = process.env['NEXT_PUBLIC_APP_ENV'] || 'development';

    return (
        <footer className="h-8 border-t border-border bg-background flex flex-none relative z-10">
            <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
                <SyncIndicator />
                <div>{!isMounted ? 'Environment: —' : `Environment: ${env} • v4.2-Alpha`}</div>
            </div>
        </footer>
    );
}
