import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFlag } from '@/lib/featureFlags/featureFlags';
import { FlagKey } from '@/lib/featureFlags/flags';

export const metadata: Metadata = {
    title: 'Style Guide | Path Logic',
    description: 'Living design system and component showcase',
};

import { AppShell } from '@/components/layout/AppShell';

export default async function StyleGuideLayout({
    children,
}: {
    children: React.ReactNode;
}): Promise<React.ReactElement> {
    // Check if style guide feature flag is enabled
    const styleGuideEnabled: boolean = await getFlag(FlagKey.STYLE_GUIDE);

    if (!styleGuideEnabled) {
        redirect('/');
    }

    return (
        <AppShell scrollable>
            <div className="space-y-4">
                <header className="flex justify-between items-center flex-none">
                    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 w-full text-center text-[10px] font-black uppercase tracking-widest text-primary">
                        Living Design System & Style Guide
                    </div>
                </header>
                <div className="p-8 pb-12">
                    <div className="mx-auto max-w-7xl">{children}</div>
                </div>
            </div>
        </AppShell>
    );
}
