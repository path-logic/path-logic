import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Home, LucideAngularModule } from 'lucide-angular';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Metadata for a single breadcrumb item.
 */
export interface IBreadcrumb {
    href: string;
    label: string;
    isLast: boolean;
}

/**
 * Map of route segments to their human-readable labels.
 */
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

/**
 * Breadcrumb navigation component that dynamically resolves labels based on the current URL.
 */
@Component({
    selector: 'app-breadcrumb-nav',
    standalone: true,
    imports: [RouterLink, LucideAngularModule],
    templateUrl: './breadcrumb-nav.component.html',
    styleUrl: './breadcrumb-nav.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbNavComponent {
    private readonly router: Router = inject(Router);
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);

    readonly HomeIcon = Home;

    /**
     * Computed signal that builds the breadcrumb list from the current URL.
     */
    readonly breadcrumbs = computed((): Array<IBreadcrumb> => {
        const url: string = this.router.url.split('?')[0] ?? '';
        const segments: Array<string> = url.split('/').filter(Boolean);

        if (segments.length < 2) {
            return new Array<IBreadcrumb>();
        }

        return segments.map((segment: string, index: number): IBreadcrumb => {
            const href: string = `/${segments.slice(0, index + 1).join('/')}`;
            const isLast: boolean = index === segments.length - 1;

            let label: string = routeLabels[segment] ?? segment;

            // Resolve account ID to name if in accounts path
            if (segments[index - 1] === 'accounts') {
                const account = this.ledgerStore.accounts().find(a => a.id === segment);
                if (account) {
                    label = account.name;
                }
            }

            // Capitalize if no specific label found
            if (label === segment) {
                label = segment.charAt(0).toUpperCase() + segment.slice(1);
            }

            return { href, label, isLast } satisfies IBreadcrumb;
        });
    });
}
