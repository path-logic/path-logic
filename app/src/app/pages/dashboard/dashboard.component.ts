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
import {
    AccountTelemetryService,
    type IAccountTelemetrySeries,
    TelemetryWindowDays
} from '../../services/account-telemetry/account-telemetry.service';
import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';

export interface IUpcomingItem {
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    frequency: string;
    accountId?: string;
    accountName: string;
}

const STARRED_ACCOUNTS_SETTING_KEY = 'starred_account_ids';
const MAX_STARRED_ACCOUNTS = 4;

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
    private readonly telemetryService: AccountTelemetryService = inject(AccountTelemetryService);
    private readonly router = inject(Router);

    readonly transactions = this.ledgerStore.transactions;
    readonly accounts = this.ledgerStore.accounts;
    readonly schedules = this.ledgerStore.schedules;
    readonly isInitialized = this.ledgerStore.isInitialized;
    readonly isLoading = computed(
        () =>
            !this.ledgerStore.isInitialized() ||
            (typeof this.ledgerStore.isLoading === 'function'
                ? this.ledgerStore.isLoading()
                : false)
    );

    readonly primaryAccountId = this.userSettingsStore.primaryAccountId;
    private readonly starredIdsOverride = signal<Array<string> | null>(null);

    /**
     * Only open and active accounts are shown on the Overview page.
     */
    readonly activeAccounts = computed((): Array<IAccount> => {
        return this.accounts().filter(
            (a: IAccount): boolean => a.isActive !== false && !a.deletedAt
        );
    });

    /**
     * Fast lookup map from accountId to account name for Recent Activity & Upcoming feeds.
     */
    readonly accountNameById = computed((): Map<string, string> => {
        return new Map(this.accounts().map((a: IAccount): [string, string] => [a.id, a.name]));
    });

    /**
     * Starred account IDs (up to 4) resolved from UserSettingsStore or account `isFavorite` flags.
     */
    readonly starredAccountIds = computed((): Array<string> => {
        const active = this.activeAccounts();
        const validIds = new Set(active.map(a => a.id));

        const override = this.starredIdsOverride();
        if (override !== null) {
            return override.filter(id => validIds.has(id)).slice(0, MAX_STARRED_ACCOUNTS);
        }

        const settingsMap =
            typeof this.userSettingsStore.settings === 'function'
                ? this.userSettingsStore.settings()
                : {};
        const rawSetting =
            settingsMap[STARRED_ACCOUNTS_SETTING_KEY] ??
            this.userSettingsStore.getSetting?.(STARRED_ACCOUNTS_SETTING_KEY);

        if (rawSetting !== undefined && rawSetting !== '') {
            try {
                const parsed: unknown = JSON.parse(rawSetting);
                if (Array.isArray(parsed)) {
                    const savedIds = parsed.filter(
                        (item): item is string => typeof item === 'string' && validIds.has(item)
                    );
                    if (savedIds.length > 0) {
                        return Array.from(new Set(savedIds)).slice(0, MAX_STARRED_ACCOUNTS);
                    }
                }
            } catch {
                // Fall back to primaryAccountId and isFavorite flags
            }
        }

        const derived: Array<string> = [];
        const primaryId = this.primaryAccountId ? this.primaryAccountId() : null;
        if (primaryId && validIds.has(primaryId)) {
            derived.push(primaryId);
        }
        for (const acc of active) {
            if (acc.isFavorite && !derived.includes(acc.id)) {
                derived.push(acc.id);
            }
        }
        return derived.slice(0, MAX_STARRED_ACCOUNTS);
    });

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
     * 5 Upcoming recurring payments/incomes with originating account names.
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
                    frequency: s.frequency,
                    accountId: s.accountId,
                    accountName: this.getAccountName(s.accountId)
                })
            );
    });

    /**
     * Open and active accounts sorted with starred accounts prioritized first,
     * followed by funded active accounts.
     */
    readonly primaryAccounts = computed((): Array<IAccount> => {
        const active = this.activeAccounts();
        if (active.length === 0) return [];

        const starredIds = this.starredAccountIds();
        const starredSet = new Set(starredIds);
        const byId = new Map(active.map(a => [a.id, a]));

        const starredList = starredIds
            .map(id => byId.get(id))
            .filter((a): a is IAccount => a !== undefined);

        const unstarred = active.filter(a => !starredSet.has(a.id));
        const fundedUnstarred = unstarred.filter(
            a => !(a.clearedBalance === 0 && a.pendingBalance === 0)
        );
        const zeroUnstarred = unstarred.filter(
            a => a.clearedBalance === 0 && a.pendingBalance === 0
        );

        return [...starredList, ...fundedUnstarred, ...zeroUnstarred].slice(0, 4);
    });

    /**
     * Selected primary hero account (or first available active account).
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

    /**
     * Memoized 30d (or 180d loan) + 14d forecast telemetry for the Hero card.
     */
    readonly heroTelemetry = computed((): IAccountTelemetrySeries | null => {
        const hero = this.heroAccount();
        if (!hero) return null;
        return this.telemetryService.buildAccountTelemetry(
            hero,
            this.transactions(),
            this.schedules(),
            {
                windowDays: TelemetryWindowDays.ThirtyDays,
                forecastDays: 14
            }
        );
    });

    /**
     * Memoized 90d + 14d forecast telemetry for the Hero card's 30d/90d toggle.
     */
    readonly heroTelemetry90d = computed((): IAccountTelemetrySeries | null => {
        const hero = this.heroAccount();
        if (!hero) return null;
        return this.telemetryService.buildAccountTelemetry(
            hero,
            this.transactions(),
            this.schedules(),
            {
                windowDays: TelemetryWindowDays.NinetyDays,
                forecastDays: 14
            }
        );
    });

    /**
     * Memoized account-type-aware telemetry series for sub-grid cards.
     */
    readonly remainingTelemetryById = computed((): Map<string, IAccountTelemetrySeries> => {
        const txs = this.transactions();
        const scheds = this.schedules();
        const map = new Map<string, IAccountTelemetrySeries>();
        for (const acc of this.remainingAccounts()) {
            map.set(acc.id, this.telemetryService.buildAccountTelemetry(acc, txs, scheds));
        }
        return map;
    });

    getAccountName(accountId: string | undefined | null): string {
        if (accountId) {
            const found = this.accountNameById().get(accountId);
            if (found) return found;
        }
        return this.activeAccounts()[0]?.name ?? this.accounts()[0]?.name ?? 'Primary Account';
    }

    isAccountStarred(accountId: string): boolean {
        return this.starredAccountIds().includes(accountId);
    }

    getSubCardTelemetry(accountId: string): IAccountTelemetrySeries | null {
        return this.remainingTelemetryById().get(accountId) ?? null;
    }

    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    async togglePrimaryAccount(accountId: string): Promise<void> {
        const current = [...this.starredAccountIds()];
        const isCurrentlyPrimary = this.primaryAccountId() === accountId;

        if (isCurrentlyPrimary || current.includes(accountId)) {
            const next = current.filter(id => id !== accountId);
            this.starredIdsOverride.set(next);
            await this.userSettingsStore.setPrimaryAccountId(next[0] ?? null);
            const store = this.userSettingsStore as {
                updateSetting?: (k: string, v: string) => Promise<void>;
                setSetting?: (k: string, v: string) => Promise<void>;
            };
            if (typeof store.updateSetting === 'function') {
                await store.updateSetting(STARRED_ACCOUNTS_SETTING_KEY, JSON.stringify(next));
            } else if (typeof store.setSetting === 'function') {
                await store.setSetting(STARRED_ACCOUNTS_SETTING_KEY, JSON.stringify(next));
            }
        } else {
            const next = [accountId, ...current.filter(id => id !== accountId)].slice(
                0,
                MAX_STARRED_ACCOUNTS
            );
            this.starredIdsOverride.set(next);
            await this.userSettingsStore.setPrimaryAccountId(accountId);
            const store = this.userSettingsStore as {
                updateSetting?: (k: string, v: string) => Promise<void>;
                setSetting?: (k: string, v: string) => Promise<void>;
            };
            if (typeof store.updateSetting === 'function') {
                await store.updateSetting(STARRED_ACCOUNTS_SETTING_KEY, JSON.stringify(next));
            } else if (typeof store.setSetting === 'function') {
                await store.setSetting(STARRED_ACCOUNTS_SETTING_KEY, JSON.stringify(next));
            }
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
