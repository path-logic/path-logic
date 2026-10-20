import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CashflowProjection, IAccount, IRecurringSchedule, ITransaction } from '@core';
import { generateProjection, Money, TransactionStatus } from '@core';

import { AccountSparklineCardComponent } from '../../components/dashboard/account-sparkline-card/account-sparkline-card.component';
import { ProjectionChartComponent } from '../../components/dashboard/projection-chart/projection-chart.component';
import { QuickEntryWidgetComponent } from '../../components/dashboard/quick-entry-widget/quick-entry-widget.component';
import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { SkeletonComponent } from '../../components/ui/skeleton';
import { LocalDatePipe } from '../../pipes/local-date.pipe';
import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';

export interface IUpcomingItem {
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    frequency: string;
}

/**
 * Main dashboard view showing financial overview, projections, quick capture, and recent activity.
 */
@Component({
    selector: 'dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        LocalDatePipe,
        AppShellComponent,
        ProjectionChartComponent,
        AccountSparklineCardComponent,
        QuickEntryWidgetComponent,
        SkeletonComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);
    private readonly userSettingsStore: UserSettingsStore = inject(UserSettingsStore);
    private readonly router = inject(Router);

    readonly transactions = this.ledgerStore.transactions;
    readonly accounts = this.ledgerStore.accounts;
    readonly schedules = this.ledgerStore.schedules;
    readonly isInitialized = this.ledgerStore.isInitialized;
    readonly isLoading = computed(
        () => !this.ledgerStore.isInitialized() || this.ledgerStore.isLoading()
    );

    readonly primaryAccountId = this.userSettingsStore.primaryAccountId;

    readonly searchQuery = signal<string>('');
    readonly isQuickEntryOpen = signal<boolean>(false);
    readonly quickEntryAccountId = signal<string | null>(null);

    readonly userName = computed((): string => {
        return this.authService.currentUser()?.displayName?.split(' ')[0] || 'Commander';
    });

    readonly currentDateFormatted = computed((): string => {
        const d = new Date();
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    });

    /**
     * Total net position across all transactions.
     */
    readonly netPosition = computed((): number => {
        const txs: Array<ITransaction> = this.transactions();
        return txs.reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0);
    });

    readonly formattedNetPosition = computed((): string =>
        Money.formatCurrency(this.netPosition())
    );

    /**
     * Sum of cleared balances.
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
     * Sum of pending balances.
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
     * 90-Day Cashflow projection data time series.
     */
    readonly projection = computed((): CashflowProjection => {
        const txs: Array<ITransaction> = this.transactions();
        const scheds: Array<IRecurringSchedule> = this.schedules();
        const todayStr: string = new Date().toISOString().split('T')[0] ?? '';

        return generateProjection(todayStr, 90, {
            clearedBalance: this.clearedBalance(),
            pendingTransactions: txs.filter(
                (tx: ITransaction): boolean =>
                    tx.status === TransactionStatus.Pending && tx.date >= todayStr
            ),
            recurringSchedules: scheds
        });
    });

    /**
     * 5 Most recent transactions.
     */
    readonly recentTransactions = computed((): Array<ITransaction> => {
        return [...this.transactions()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
    });

    /**
     * 5 Upcoming recurring payments/incomes.
     */
    readonly upcomingPayments = computed((): Array<IUpcomingItem> => {
        return this.schedules()
            .slice(0, 5)
            .map(
                (s: IRecurringSchedule): IUpcomingItem => ({
                    id: s.id,
                    name: s.payee,
                    dueDate: s.nextDueDate || s.startDate,
                    amount: s.amount,
                    frequency: s.frequency
                })
            );
    });

    /**
     * Primary accounts sorted with the user's selected primary/hero account first.
     */
    readonly primaryAccounts = computed((): Array<IAccount> => {
        const all = this.accounts();
        const primaryId = this.primaryAccountId();
        if (!primaryId) return all.slice(0, 4);

        const primary = all.find(a => a.id === primaryId);
        if (!primary) return all.slice(0, 4);

        const others = all.filter(a => a.id !== primaryId);
        return [primary, ...others].slice(0, 4);
    });

    /**
     * Selected primary hero account (or first available account).
     */
    readonly heroAccount = computed((): IAccount | null => {
        return this.primaryAccounts()[0] ?? null;
    });

    /**
     * Remaining accounts for the sub-grid in Variant B.
     */
    readonly remainingAccounts = computed((): Array<IAccount> => {
        return this.primaryAccounts().slice(1);
    });

    getTrendPercent(index: number): string {
        const mockTrends = ['+1.1%', '+0.5%', '+3.4%', '-1.2%'];
        return mockTrends[index % mockTrends.length] ?? '+1.0%';
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    async togglePrimaryAccount(accountId: string): Promise<void> {
        if (this.primaryAccountId() === accountId) {
            await this.userSettingsStore.setPrimaryAccountId(null);
        } else {
            await this.userSettingsStore.setPrimaryAccountId(accountId);
        }
    }

    openQuickEntry(accountId?: string): void {
        this.quickEntryAccountId.set(accountId ?? null);
        this.isQuickEntryOpen.set(true);
    }

    closeQuickEntry(): void {
        this.isQuickEntryOpen.set(false);
        this.quickEntryAccountId.set(null);
    }

    navigateToAddAccount(): void {
        this.router.navigate(['/accounts'], { queryParams: { action: 'new' } });
    }
}
