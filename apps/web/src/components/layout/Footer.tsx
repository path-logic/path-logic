'use client';

import * as React from 'react';
import { SyncIndicator } from '../sync/SyncIndicator';

export function Footer(): React.JSX.Element {
    return (
        <footer className="h-8 border-t border-border bg-background flex flex-none relative z-10">
            <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
                <SyncIndicator />
                <div>Environment: Local Engine • v4.2-Alpha</div>
            </div>
        </footer>
    );
}
