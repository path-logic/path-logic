import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountType, type IAccount, Money } from '@core';
import {
    Banknote,
    ChevronDown,
    ChevronRight,
    CreditCard,
    Landmark,
    LucideAngularModule,
    Plus,
    Trash2,
    Wallet
} from 'lucide-angular';

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
        LucideAngularModule,
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

    // State
    readonly expandedId = signal<string | null>(null);
    readonly isAddDialogOpen = signal<boolean>(false);
    readonly pendingDeleteId = signal<string | null>(null);
    readonly isDeleteConfirmOpen = signal<boolean>(false);
    readonly isOnboarding = signal<boolean>(false);

    // Store Signals
    readonly accounts = this.ledgerStore.accounts;
    readonly isDbReady = this.ledgerStore.isInitialized;

    constructor() {
        effect(
            () => {
                if (this.isDbReady()) {
                    if (this.accounts().length === 0 && !this.isOnboarding()) {
                        this.isOnboarding.set(true);
                    }
                }
            },
            { allowSignalWrites: true }
        );
    }

    handleOnboardingCompleted(): void {
        this.isOnboarding.set(false);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getIcon(type: AccountType): any {
        switch (type) {
            case AccountType.Checking:
                return Landmark;
            case AccountType.Savings:
                return Banknote;
            case AccountType.Credit:
                return CreditCard;
            case AccountType.Cash:
                return Wallet;
            default:
                return Landmark;
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

    // Lucide Icons
    readonly Plus = Plus;
    readonly Trash2 = Trash2;
    readonly ChevronDown = ChevronDown;
    readonly ChevronRight = ChevronRight;
}
