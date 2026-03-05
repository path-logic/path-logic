import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { AccountLedgerComponent } from '../../components/ledger/account-ledger/account-ledger.component';

/**
 * Page component that displays the ledger for a specific account.
 * Uses component input binding to receive the accountId from the route.
 */
@Component({
    selector: 'app-account-detail',
    standalone: true,
    imports: [CommonModule, AccountLedgerComponent, AppShellComponent],
    templateUrl: './account-detail.component.html',
    styleUrls: ['./account-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailComponent {
    /**
     * Account ID bound from the route parameter ':accountId'.
     */
    readonly accountId = input.required<string>();
}
