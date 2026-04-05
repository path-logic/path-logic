import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountType, type IAccount, Money } from '@path-logic/core';
import {
    Banknote,
    ChevronDown,
    ChevronRight,
    CreditCard,
    Landmark,
    LucideAngularModule,
    Plus,
    Wallet,
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
    selector: 'app-accounts-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        LucideAngularModule,
        WelcomeWizardComponent,
        NewAccountDialogComponent,
        AppShellComponent,
    ],
    templateUrl: './accounts-page.component.html',
    styleUrls: ['./accounts-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsPageComponent {
    private readonly ledgerStore = inject(LedgerStore);

    // State
    readonly expandedId = signal<string | null>(null);
    readonly isAddDialogOpen = signal<boolean>(false);

    // Store Signals
    readonly accounts = this.ledgerStore.accounts;

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
        this.isAddDialogOpen.set(false);
    }

    // Lucide Icons
    readonly Plus = Plus;
    readonly ChevronDown = ChevronDown;
    readonly ChevronRight = ChevronRight;
}
