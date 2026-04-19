import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { type IAccount } from '@core';
import { ChevronLeft, Info, LucideAngularModule } from 'lucide-angular';

import { AccountEditFormComponent } from '../../../components/accounts/account-edit-form/account-edit-form.component';
import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Page component for viewing and editing account metadata.
 * Uses component input binding for accountId.
 */
@Component({
    selector: 'account-info',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, AccountEditFormComponent, AppShellComponent],
    templateUrl: './account-info.component.html',
    styleUrls: ['./account-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountInfoComponent {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly router = inject(Router);

    /**
     * Account ID bound from the route parameter ':accountId'.
     */
    readonly accountId = input.required<string>();

    /**
     * The account object derived from the store.
     */
    readonly account = computed(() => {
        return this.ledgerStore.accounts().find(acc => acc.id === this.accountId()) || null;
    });

    constructor() {
        // Redirect if account is not found after initialization
        effect(() => {
            const acc = this.account();
            if (!acc) {
                // We might want to wait for initialization if accounts are empty on start
                // but if we have accounts and still can't find it, redirect.
                if (this.ledgerStore.accounts().length > 0) {
                    this.router.navigate(['/accounts']);
                }
            }
        });
    }

    handleCancel(): void {
        this.router.navigate(['/accounts', this.accountId()]);
    }

    async handleSubmit(updated: IAccount): Promise<void> {
        await this.ledgerStore.updateAccount(updated);
        this.router.navigate(['/accounts', this.accountId()]);
    }

    // Lucide Icons
    readonly ChevronLeft = ChevronLeft;
    readonly Info = Info;
}
