import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountType, type IAccount, Money } from '@core';

import { AccountEditFormComponent } from '../../components/accounts/account-edit-form/account-edit-form.component';
import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { NewAccountDialogComponent } from '../../components/onboarding/new-account-dialog/new-account-dialog.component';
import { WelcomeWizardComponent } from '../../components/onboarding/welcome-wizard/welcome-wizard.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

export type AccountCategoryFilter = 'all' | 'banking' | 'credit' | 'loans' | 'trash';

/**
 * Page for managing all accounts.
 * Shows a two-tier portfolio with primary hero accounts and consolidated list.
 */
@Component({
    selector: 'accounts-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        WelcomeWizardComponent,
        NewAccountDialogComponent,
        AccountEditFormComponent,
        AppShellComponent
    ],
    templateUrl: './accounts-page.component.html',
    styleUrls: ['./accounts-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsPageComponent {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    // State
    readonly expandedId = signal<string | null>(null);
    readonly isAddDialogOpen = signal<boolean>(false);
    readonly pendingDeleteId = signal<string | null>(null);
    readonly isDeleteConfirmOpen = signal<boolean>(false);
    readonly isOnboarding = signal<boolean>(false);
    readonly activeFilter = signal<AccountCategoryFilter>('all');

    // Store Signals
    readonly accounts = this.ledgerStore.accounts;
    readonly trashedAccounts = this.ledgerStore.trashedAccounts;
    readonly isDbReady = this.ledgerStore.isInitialized;

    // Counts
    readonly bankingCount = computed(
        () =>
            this.accounts().filter(
                a =>
                    a.type === AccountType.Checking ||
                    a.type === AccountType.Savings ||
                    a.type === AccountType.Cash
            ).length
    );
    readonly creditCount = computed(
        () => this.accounts().filter(a => a.type === AccountType.Credit).length
    );
    readonly loansCount = computed(
        () =>
            this.accounts().filter(
                a =>
                    a.type === AccountType.Mortgage ||
                    a.type === AccountType.AutoLoan ||
                    a.type === AccountType.PersonalLoan
            ).length
    );

    // Top Hero Primary Accounts (up to 3 primary accounts)
    readonly primaryAccounts = computed(() => {
        return this.accounts().slice(0, 3);
    });

    // Secondary / Consolidated Accounts (remaining accounts)
    readonly secondaryAccounts = computed(() => {
        return this.accounts().slice(3);
    });

    // Filtered accounts list when browsing by specific category
    readonly filteredAccounts = computed(() => {
        const filter = this.activeFilter();
        const all = this.accounts();
        if (filter === 'banking') {
            return all.filter(
                a =>
                    a.type === AccountType.Checking ||
                    a.type === AccountType.Savings ||
                    a.type === AccountType.Cash
            );
        }
        if (filter === 'credit') {
            return all.filter(a => a.type === AccountType.Credit);
        }
        if (filter === 'loans') {
            return all.filter(
                a =>
                    a.type === AccountType.Mortgage ||
                    a.type === AccountType.AutoLoan ||
                    a.type === AccountType.PersonalLoan
            );
        }
        return all;
    });

    // Trash View & Purge Modal State
    readonly isTrashOpen = computed(() => this.activeFilter() === 'trash');
    readonly pendingPurgeId = signal<string | null>(null);
    readonly isPurgeConfirmOpen = signal<boolean>(false);
    readonly isEmptyTrashConfirmOpen = signal<boolean>(false);

    constructor() {
        effect(() => {
            if (this.isDbReady()) {
                if (this.accounts().length === 0 && !this.isOnboarding()) {
                    this.isOnboarding.set(true);
                }
            }
        });

        // Auto-open the Add Account dialog when navigated with ?openDialog=true
        this.route.queryParams.subscribe(params => {
            if (params['openDialog'] === 'true') {
                this.isAddDialogOpen.set(true);
                // Consume the query param so it doesn't re-trigger on refresh
                void this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: {},
                    replaceUrl: true
                });
            }
        });
    }

    handleOnboardingCompleted(): void {
        this.isOnboarding.set(false);
    }

    openAddAccount(type?: string): void {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            void this.router.navigate(['/accounts/new'], {
                queryParams: type ? { type } : {}
            });
        } else {
            this.isAddDialogOpen.set(true);
        }
    }

    getFilterLabel(filter: string): string {
        switch (filter) {
            case 'banking':
                return 'Banking & Cash';
            case 'credit':
                return 'Credit Card';
            case 'loans':
                return 'Loan & Mortgage';
            default:
                return 'Account';
        }
    }

    /**
     * Helper to determine account icon based on type
     */
    getAccountIcon(type: AccountType): string {
        switch (type) {
            case AccountType.Checking:
                return 'pi-building-columns';
            case AccountType.Savings:
                return 'pi-chart-line';
            case AccountType.Credit:
                return 'pi-credit-card';
            case AccountType.Cash:
                return 'pi-wallet';
            case AccountType.Mortgage:
                return 'pi-home';
            case AccountType.AutoLoan:
                return 'pi-car';
            case AccountType.PersonalLoan:
                return 'pi-percentage';
            default:
                return 'pi-building-columns';
        }
    }

    /**
     * Helper to determine account badge background and text colors based on type
     */
    getAccountBadgeClass(type: AccountType): string {
        switch (type) {
            case AccountType.Checking:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case AccountType.Savings:
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case AccountType.Credit:
                return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
            case AccountType.Cash:
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case AccountType.Mortgage:
            case AccountType.AutoLoan:
            case AccountType.PersonalLoan:
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            default:
                return 'bg-primary/10 text-primary border-primary/20';
        }
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    /**
     * Formats balance for an account. Credit cards and loans are formatted as positive balance due.
     */
    formattedAccountBalance(account: IAccount): string {
        const raw = account.clearedBalance + account.pendingBalance;
        if (this.isLiability(account.type)) {
            return Money.formatCurrency(Math.abs(raw));
        }
        return Money.formatCurrency(raw);
    }

    isLiability(type: AccountType): boolean {
        return (
            type === AccountType.Credit ||
            type === AccountType.Mortgage ||
            type === AccountType.AutoLoan ||
            type === AccountType.PersonalLoan
        );
    }

    setFilter(filter: AccountCategoryFilter): void {
        this.activeFilter.set(filter);
    }

    toggleExpand(accountId: string): void {
        this.expandedId.update(id => (id === accountId ? null : accountId));
    }

    handleAccountCreated(account: IAccount): void {
        this.ledgerStore.addAccount(account);
    }

    requestDeleteAccount(accountId: string, event: Event): void {
        event.stopPropagation();
        this.pendingDeleteId.set(accountId);
        this.isDeleteConfirmOpen.set(true);
    }

    confirmDeleteAccount(): void {
        const id = this.pendingDeleteId();
        if (id) {
            void this.ledgerStore.removeAccount(id);
            if (this.expandedId() === id) this.expandedId.set(null);
        }
        this.isDeleteConfirmOpen.set(false);
        this.pendingDeleteId.set(null);
    }

    cancelDelete(): void {
        this.isDeleteConfirmOpen.set(false);
        this.pendingDeleteId.set(null);
    }

    toggleTrash(): void {
        this.activeFilter.update(f => (f === 'trash' ? 'all' : 'trash'));
    }

    async handleRestoreAccount(accountId: string): Promise<void> {
        await this.ledgerStore.restoreAccount(accountId);
    }

    requestPurgeAccount(accountId: string): void {
        this.pendingPurgeId.set(accountId);
        this.isPurgeConfirmOpen.set(true);
    }

    async confirmPurgeAccount(): Promise<void> {
        const id = this.pendingPurgeId();
        if (id) {
            await this.ledgerStore.purgeAccount(id);
        }
        this.isPurgeConfirmOpen.set(false);
        this.pendingPurgeId.set(null);
    }

    cancelPurge(): void {
        this.isPurgeConfirmOpen.set(false);
        this.pendingPurgeId.set(null);
    }

    requestEmptyTrash(): void {
        this.isEmptyTrashConfirmOpen.set(true);
    }

    async confirmEmptyTrash(): Promise<void> {
        await this.ledgerStore.emptyTrash();
        this.isEmptyTrashConfirmOpen.set(false);
    }

    cancelEmptyTrash(): void {
        this.isEmptyTrashConfirmOpen.set(false);
    }
}
