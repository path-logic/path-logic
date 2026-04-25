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

    /**
     * The "home" slot holds the first route segment so PrimeNG never
     * renders a separator before it. Subsequent segments go into `model`.
     */
    readonly home = computed((): MenuItem => {
        const url: string = this.router.url.split('?')[0] ?? '';
        const segments: Array<string> = url.split('/').filter(Boolean);
        const first = segments[0];
        if (!first) return { icon: 'pi pi-home', routerLink: '/' };

        const label = routeLabels[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
        return { label, routerLink: `/${first}` };
    });

    /**
     * Computed signal that builds the breadcrumb list from the current URL.
     * Only segments after the first are included — the first is in `home`.
     */
    readonly breadcrumbs = computed((): Array<MenuItem> => {
        const url: string = this.router.url.split('?')[0] ?? '';
        const segments: Array<string> = url.split('/').filter(Boolean);

        // Need at least 2 segments to show breadcrumbs beyond the home item
        if (segments.length < 2) {
            return new Array<MenuItem>();
        }

        // Skip index 0 — that's handled by the home slot above
        return segments.slice(1).map((segment: string, index: number): MenuItem => {
            const absoluteIndex = index + 1; // index relative to full segments array
            const routerLink: string = `/${segments.slice(0, absoluteIndex + 1).join('/')}`;

            let label: string = routeLabels[segment] ?? segment;

            // Resolve account ID to name if in accounts path
            if (segments[absoluteIndex - 1] === 'accounts') {
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
