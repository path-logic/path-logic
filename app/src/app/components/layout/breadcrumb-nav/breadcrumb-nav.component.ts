import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { type MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

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
    info: 'Information'
};

/**
 * Breadcrumb navigation component that dynamically resolves labels based on the current URL.
 */
@Component({
    selector: 'breadcrumb-nav',
    standalone: true,
    imports: [Breadcrumb],
    templateUrl: './breadcrumb-nav.component.html',
    styleUrl: './breadcrumb-nav.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbNavComponent {
    private readonly router: Router = inject(Router);
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);

    readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

    /**
     * Computed signal that builds the breadcrumb list from the current URL.
     */
    readonly breadcrumbs = computed((): Array<MenuItem> => {
        const url: string = this.router.url.split('?')[0] ?? '';
        const segments: Array<string> = url.split('/').filter(Boolean);

        if (segments.length < 2) {
            return new Array<MenuItem>();
        }

        return segments.map((segment: string, index: number): MenuItem => {
            const routerLink: string = `/${segments.slice(0, index + 1).join('/')}`;

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

            return { label, routerLink };
        });
    });
}
