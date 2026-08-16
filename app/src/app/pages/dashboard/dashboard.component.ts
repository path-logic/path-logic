import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { CashflowProjection, IAccount, IRecurringSchedule, ITransaction } from '@core';
import { AccountType, generateProjection, Money, TransactionStatus } from '@core';
import { LocalDatePipe } from '../../pipes/local-date.pipe';

import { ProjectionChartComponent } from '../../components/dashboard/projection-chart/projection-chart.component';
import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

/**
 * Main dashboard view showing financial overview, projections, and recent activity.
 */
@Component({
    selector: 'dashboard',
    standalone: true,
    imports: [RouterLink, LocalDatePipe, AppShellComponent, ProjectionChartComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly router = inject(Router);

    readonly transactions = this.ledgerStore.transactions;
    readonly accounts = this.ledgerStore.accounts;
    readonly isInitialized = this.ledgerStore.isInitialized;

    // Icons

    /**
     * Total net position (cleared + pending).
     */
    readonly netPosition = computed((): number => {
        const txs: Array<ITransaction> = this.transactions();
        return txs.reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);
    });

    readonly formattedNetPosition = computed((): string =>
        Money.formatCurrency(this.netPosition())
    );

    /**
     * Sum of all cleared transactions.
     */
    readonly clearedBalance = computed((): number => {
        return this.transactions()
            .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Cleared)
            .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);
    });

    readonly formattedClearedBalance = computed((): string =>
        Money.formatCurrency(this.clearedBalance())
    );

    /**
     * Sum of all pending transactions.
     */
    readonly pendingBalance = computed((): number => {
        return this.transactions()
            .filter((tx: ITransaction): boolean => tx.status === TransactionStatus.Pending)
            .reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);
    });

    readonly formattedPendingBalance = computed((): string =>
        Money.formatCurrency(this.pendingBalance())
    );

    /**
     * Last 5 transactions sorted by date descending.
     */
    readonly recentTransactions = computed((): Array<ITransaction> => {
        return new Array<ITransaction>(...this.transactions())
            .sort(
                (a: ITransaction, b: ITransaction): number =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .slice(0, 5);
    });

    /**
     * 90-day cashflow forecast.
     */
    readonly projection = computed((): CashflowProjection => {
        if (!this.isInitialized()) return new Array<CashflowProjection[number]>();

        return generateProjection(new Date().toISOString().split('T')[0] || '', 90, {
            clearedBalance: this.clearedBalance(),
            pendingTransactions: this.transactions().filter(
                (t: ITransaction): boolean => t.status === TransactionStatus.Pending
            ),
            recurringSchedules: new Array<IRecurringSchedule>() // To be implemented
        });
    });

    /**
     * Navigates to the accounts page.
     * When accounts already exist (user is past onboarding), appends a query
     * param so the accounts page auto-opens the "Add Account" dialog.
     */
    navigateToAddAccount(): void {
        const hasAccounts = this.accounts().length > 0;
        void this.router.navigate(['/accounts'], {
            queryParams: hasAccounts ? { openDialog: 'true' } : null
        });
    }

    /**
     * Formats a raw amount as currency.
     */
    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    /**
     * Returns the formatted balance for a specific account.
     * Credit cards and loans are formatted as positive balance due.
     */
    formattedAccountBalance(account: IAccount): string {
        const raw = account.clearedBalance + account.pendingBalance;
        if (account.type === AccountType.Credit) {
            return Money.formatCurrency(Math.abs(raw));
        }
        return Money.formatCurrency(raw);
    }

    /**
     * Returns the appropriate PrimeIcon class for an account type.
     */
    getAccountIcon(type: AccountType): string {
        switch (type) {
            case AccountType.Checking:
                return 'pi-building-columns';
            case AccountType.Savings:
                return 'pi-chart-line';
            case AccountType.Credit:
                return 'pi-credit-card';
            default:
                return 'pi-wallet';
        }
    }
}
