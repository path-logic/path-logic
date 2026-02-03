import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFlag } from '@/lib/featureFlags/featureFlags';
import { FlagKey } from '@/lib/featureFlags/flags';

export const metadata: Metadata = {
    title: 'Developer Tools | Path Logic',
    description: 'Developer testing and debugging tools',
};

import { AppShell } from '@/components/layout/AppShell';

export default async function DevLayout({
    children,
}: {
    children: React.ReactNode;
}): Promise<React.ReactElement> {
    // Check if dev tools feature flag is enabled
    const devToolsEnabled: boolean = await getFlag(FlagKey.DEV_TOOLS);

    if (!devToolsEnabled) {
        redirect('/');
    }

    return (
        <AppShell>
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Warning Banner inside the content area but above children */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                    ⚠️ Developer Tools - Not for Production Use
                </div>

                <div className="flex-1 overflow-auto p-8">
                    <div className="mx-auto max-w-7xl w-full">{children}</div>
                </div>
            </div>
        </AppShell>
    );
}
