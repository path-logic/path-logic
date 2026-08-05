import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountType, type IAccount, Money } from '@core';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { NewAccountDialogComponent } from '../../components/onboarding/new-account-dialog/new-account-dialog.component';
import { WelcomeWizardComponent } from '../../components/onboarding/welcome-wizard/welcome-wizard.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

/**
 * Page for managing all accounts.
 * Shows a list of accounts with basic actions and provides an onboarding flow
 * if no accounts exist.
 */
@Component({
    selector: 'accounts-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        WelcomeWizardComponent,
        NewAccountDialogComponent,
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

    // Store Signals
    readonly accounts = this.ledgerStore.accounts;
    readonly trashedAccounts = this.ledgerStore.trashedAccounts;
    readonly isDbReady = this.ledgerStore.isInitialized;

    // Trash View & Purge Modal State
    readonly isTrashOpen = signal<boolean>(false);
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
            default:
                return 'pi-building-columns';
        }
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    toggleExpand(accountId: string): void {
        this.expandedId.update(id => (id === accountId ? null : accountId));
    }

    handleAccountCreated(account: IAccount): void {
        this.ledgerStore.addAccount(account);
        // Do not close the dialog here — the wizard proceeds to the import step
        // (step 3) and will emit (closed) when the user finishes or skips.
    }

    requestDeleteAccount(accountId: string, event: Event): void {
        event.stopPropagation(); // Don't toggle the expand panel
        this.pendingDeleteId.set(accountId);
        this.isDeleteConfirmOpen.set(true);
    }

    confirmDeleteAccount(): void {
        const id = this.pendingDeleteId();
        if (id) {
            void this.ledgerStore.removeAccount(id);
            // Collapse if this account was expanded
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
        this.isTrashOpen.update(v => !v);
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
