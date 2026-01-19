import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFlag } from '@/lib/featureFlags/featureFlags';
import { FlagKey } from '@/lib/featureFlags/flags';

export const metadata: Metadata = {
    title: 'Developer Tools | Path Logic',
    description: 'Developer testing and debugging tools',
};

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
        <div className="min-h-screen bg-gray-50">
            {/* Warning Banner */}
            <div className="bg-yellow-500 px-4 py-2 text-center text-sm font-semibold text-yellow-900">
                ⚠️ Developer Tools - Not for Production Use
            </div>

            {/* Content */}
            <div className="mx-auto max-w-7xl p-6">
                {children}
            </div>
        </div>
    );
}
