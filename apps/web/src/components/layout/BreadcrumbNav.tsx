'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLedgerStore } from '@/store/ledgerStore';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
    accounts: 'Accounts',
    payees: 'Payees',
    settings: 'Settings',
    'style-guide': 'Style Guide',
    dev: 'Developer Tools',
    'sync-test': 'Sync Test',
    auth: 'Authentication',
    info: 'Information',
};

export function BreadcrumbNav(): React.JSX.Element | null {
    const pathname = usePathname();
    const { accounts } = useLedgerStore();

    const segments = pathname.split('/').filter(Boolean);

    if (segments.length < 2) return null;

    // Build breadcrumbs array
    const breadcrumbs = segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;

        let label = routeLabels[segment] || segment;

        // Try to resolve account ID to name if we are in the accounts path
        if (segments[index - 1] === 'accounts') {
            const account = accounts.find(a => a.id === segment);
            if (account) {
                label = account.name;
            }
        }

        // Capitalize if no specific label found
        if (label === segment) {
            label = segment.charAt(0).toUpperCase() + segment.slice(1);
        }

        return { href, label, isLast };
    });

    return (
        <Breadcrumb className="mb-2">
            <BreadcrumbList className="text-[10px] uppercase font-bold tracking-wider">
                {breadcrumbs.map(crumb => (
                    <React.Fragment key={crumb.href}>
                        <BreadcrumbItem>
                            {crumb.isLast ? (
                                <BreadcrumbPage className="text-primary">
                                    {crumb.label}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link
                                        href={crumb.href}
                                        className="hover:text-primary transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!crumb.isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
