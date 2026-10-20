import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { IAccount } from '@core';
import { type MenuItem } from 'primeng/api';

import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AccountDropdownComponent } from '../../ledger/account-dropdown/account-dropdown.component';

/**
 * Breadcrumb item interface for semantic navigation.
 */
export interface IBreadcrumbItem {
    label: string;
    routerLink: string;
    icon?: string;
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
    info: 'Information'
};

/**
 * Breadcrumb navigation component that dynamically resolves labels based on the current URL.
 * Embeds an interactive AccountDropdown on account routes and exposes a global Command Palette trigger.
 */
@Component({
    selector: 'breadcrumb-nav',
    standalone: true,
    imports: [RouterLink, AccountDropdownComponent],
    templateUrl: './breadcrumb-nav.component.html',
    styleUrl: './breadcrumb-nav.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbNavComponent {
    private readonly router: Router = inject(Router);
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly commandPaletteService: CommandPaletteService = inject(CommandPaletteService);

    readonly currentUrl = computed((): string => this.router.url.split('?')[0] ?? '');
    readonly segments = computed((): Array<string> => this.currentUrl().split('/').filter(Boolean));

    /**
     * Identifies the current account ID when within an account route (/accounts/:accountId).
     */
    readonly currentAccountId = computed((): string | null => {
        const segs: Array<string> = this.segments();
        if (segs.length >= 2 && segs[0] === 'accounts') {
            const id: string | undefined = segs[1];
            if (id && id !== 'new') {
                return id;
            }
        }
        return null;
    });

    /**
     * The first route segment (or Home/Overview if at root).
     */
    readonly home = computed((): IBreadcrumbItem => {
        const segs: Array<string> = this.segments();
        const first: string | undefined = segs[0];
        if (!first) return { icon: 'pi pi-home', label: 'Overview', routerLink: '/' };

        const label: string = routeLabels[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
        return { label, routerLink: `/${first}` };
    });

    /**
     * Subsequent breadcrumb items beyond the home/account segment.
     */
    readonly remainingCrumbs = computed((): Array<IBreadcrumbItem> => {
        const segs: Array<string> = this.segments();

        if (this.currentAccountId()) {
            if (segs.length <= 2) return [];
            return segs.slice(2).map((segment: string, idx: number): IBreadcrumbItem => {
                const absoluteIndex: number = idx + 2;
                const routerLink: string = `/${segs.slice(0, absoluteIndex + 1).join('/')}`;
                let label: string = routeLabels[segment] ?? segment;
                if (segment === 'info') label = 'Account Details';
                else if (segment === 'splits') label = 'Split Transaction';
                else if (label === segment)
                    label = segment.charAt(0).toUpperCase() + segment.slice(1);
                return { label, routerLink };
            });
        }

        if (segs.length < 2) return [];
        return segs.slice(1).map((segment: string, idx: number): IBreadcrumbItem => {
            const absoluteIndex: number = idx + 1;
            const routerLink: string = `/${segs.slice(0, absoluteIndex + 1).join('/')}`;
            let label: string = routeLabels[segment] ?? segment;
            if (label === segment) label = segment.charAt(0).toUpperCase() + segment.slice(1);
            return { label, routerLink };
        });
    });

    /**
     * PrimeNG MenuItem compatibility for legacy stories/consumers.
     */
    readonly breadcrumbs = computed((): Array<MenuItem> => {
        const crumbs: Array<IBreadcrumbItem> = this.remainingCrumbs();
        return crumbs.map(
            (c: IBreadcrumbItem): MenuItem => ({ label: c.label, routerLink: c.routerLink })
        );
    });

    /**
     * List of all accounts for the switcher.
     */
    readonly accounts = computed((): Array<IAccount> => {
        return typeof this.ledgerStore.accounts === 'function' ? this.ledgerStore.accounts() : [];
    });

    /**
     * Whether multiple accounts exist to warrant a selectable dropdown.
     */
    readonly hasMultipleAccounts = computed((): boolean => this.accounts().length > 1);

    /**
     * The active account object if currently on an account route.
     */
    readonly currentAccount = computed((): IAccount | null => {
        const id = this.currentAccountId();
        if (!id) return null;
        return this.accounts().find(a => a.id === id) ?? null;
    });

    /**
     * The active account display name.
     */
    readonly currentAccountName = computed((): string => {
        return this.currentAccount()?.name ?? 'Account';
    });

    /**
     * Formatted balance for the active single account.
     */
    readonly currentAccountBalanceFormatted = computed((): string | null => {
        const id = this.currentAccountId();
        if (!id) return null;
        const balanceCents = this.getAccountBalance(id);
        return (balanceCents / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    });

    /**
     * Account balance lookup bound function.
     */
    readonly getAccountBalance = (id: string): number => {
        const txs =
            typeof this.ledgerStore.transactions === 'function'
                ? this.ledgerStore.transactions()
                : [];
        return txs.filter(t => t.accountId === id).reduce((sum, t) => sum + t.totalAmount, 0);
    };

    /**
     * Handles account switching from the breadcrumbs dropdown.
     */
    onAccountSelect(accountId: string | null): void {
        if (!accountId) return;
        const segs: Array<string> = this.segments();
        if (segs.length > 2 && segs[2] === 'info') {
            void this.router.navigate(['/accounts', accountId, 'info']);
        } else {
            void this.router.navigate(['/accounts', accountId]);
        }
    }

    /**
     * Opens the global command palette.
     */
    openCommandPalette(): void {
        this.commandPaletteService.open();
    }
}
