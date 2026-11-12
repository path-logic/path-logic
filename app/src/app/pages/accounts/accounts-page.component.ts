import { CommonModule } from '@angular/common';
import type { OnDestroy, TemplateRef } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
    untracked,
    viewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountType, type IAccount, Money } from '@core';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { AccountAugmentationBannerComponent } from '../../components/ledger/account-augmentation-banner/account-augmentation-banner.component';
import { NewAccountDialogComponent } from '../../components/onboarding/new-account-dialog/new-account-dialog.component';
import { WelcomeWizardComponent } from '../../components/onboarding/welcome-wizard/welcome-wizard.component';
import { SkeletonComponent } from '../../components/ui/skeleton';
import {
    AccountTelemetryService,
    buildSteppedSvgGeometry,
    type IAccountTelemetrySeries,
    type ISteppedSvgGeometry,
    TelemetrySemanticMode,
    TelemetryWindowDays
} from '../../services/account-telemetry/account-telemetry.service';
import { AccountAugmentationService } from '../../services/import-export/account-augmentation.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';

export type AccountCategoryFilter = 'all' | 'banking' | 'credit' | 'loans' | 'trash';

export interface IAccountTypePortfolioGroup {
    type: AccountType;
    label: string;
    icon: string;
    badgeClass: string;
    accounts: Array<IAccount>;
    totalBalance: number;
    isLiability: boolean;
}

const STARRED_ACCOUNTS_SETTING_KEY = 'starred_account_ids';

const ACCOUNT_TYPE_ORDER: ReadonlyArray<{ type: AccountType; label: string }> = [
    { type: AccountType.Checking, label: 'Checking' },
    { type: AccountType.Savings, label: 'Savings' },
    { type: AccountType.Cash, label: 'Cash' },
    { type: AccountType.Credit, label: 'Credit Cards' },
    { type: AccountType.Mortgage, label: 'Mortgages' },
    { type: AccountType.AutoLoan, label: 'Auto Loans' },
    { type: AccountType.PersonalLoan, label: 'Personal Loans' }
];

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
        AccountAugmentationBannerComponent,
        AppShellComponent,
        SkeletonComponent
    ],
    templateUrl: './accounts-page.component.html',
    styleUrls: ['./accounts-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsPageComponent implements OnDestroy {
    static readonly MAX_STARRED_ACCOUNTS = 4;
    readonly maxStarredAccounts = AccountsPageComponent.MAX_STARRED_ACCOUNTS;

    private readonly ledgerStore = inject(LedgerStore);
    private readonly userSettingsStore = inject(UserSettingsStore);
    private readonly telemetryService = inject(AccountTelemetryService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly sidebarContext = inject(SidebarContextService, { optional: true });
    readonly augmentationService = inject(AccountAugmentationService, { optional: true });

    readonly sidebarTools = viewChild<TemplateRef<unknown>>('sidebarTools');
    readonly isActionsMenuOpen = signal<boolean>(false);

    readonly primaryAccountId = this.userSettingsStore.primaryAccountId;
    private readonly starredIdsOverride = signal<Array<string> | null>(null);

    // Grouping, Filter & Layout State
    readonly groupByType = signal<boolean>(true);
    readonly showClosedAccounts = signal<boolean>(false);
    readonly collapsedTypeGroups = signal<Record<string, boolean>>({});
    readonly expandedSectionCards = signal<Record<string, boolean>>({});

    // State
    readonly expandedId = signal<string | null>(null);
    readonly isAddDialogOpen = signal<boolean>(false);
    readonly pendingDeleteId = signal<string | null>(null);
    readonly isDeleteConfirmOpen = signal<boolean>(false);
    readonly isOnboarding = signal<boolean>(false);
    readonly activeFilter = signal<AccountCategoryFilter>('all');

    // Store Signals
    readonly accounts = this.ledgerStore.accounts;
    readonly transactions = this.ledgerStore.transactions;
    readonly schedules = this.ledgerStore.schedules;
    readonly trashedAccounts = this.ledgerStore.trashedAccounts;
    readonly isDbReady = this.ledgerStore.isInitialized;
    readonly isLoading = computed(
        () => !this.ledgerStore.isInitialized() || this.ledgerStore.isLoading()
    );

    /**
     * Memoized 90d History + 30d Forecast telemetry for the currently expanded account drawer.
     */
    readonly expandedAccountTelemetry = computed<IAccountTelemetrySeries | null>(() => {
        const expId = this.expandedId();
        if (!expId) return null;
        const target = this.accounts().find(a => a.id === expId);
        if (!target) return null;
        const txs = typeof this.transactions === 'function' ? this.transactions() : [];
        const scheds = typeof this.schedules === 'function' ? this.schedules() : [];
        return this.telemetryService.buildAccountTelemetry(target, txs, scheds, {
            windowDays: TelemetryWindowDays.NinetyDays,
            forecastDays: 30
        });
    });

    readonly expandedAccountSvgGeometry = computed<ISteppedSvgGeometry | null>(() => {
        const series = this.expandedAccountTelemetry();
        if (!series) return null;
        return buildSteppedSvgGeometry({
            values: series.points.map(p => p.displayValue),
            forecastValues: series.projectedPoints.map(p => p.displayValue),
            ceilingValue: series.creditLimitCents,
            width: 240,
            height: 44,
            paddingTop: 5,
            paddingBottom: 5,
            isFlatZero: series.isZeroFlat
        });
    });

    readonly expandedAccountStrokeColor = computed<string>(() => {
        const series = this.expandedAccountTelemetry();
        if (!series || series.isZeroFlat) return '#94a3b8';
        if (series.semanticMode === TelemetrySemanticMode.RevolvingCredit) {
            return series.netDeltaCents > 0 ? '#f59e0b' : '#10b981';
        }
        return series.isFavorableDelta ? '#10b981' : '#ef4444';
    });

    /**
     * Number of closed (inactive) accounts in the workspace.
     */
    readonly closedAccountsCount = computed<number>(
        () => this.accounts().filter(a => a.isActive === false).length
    );

    /**
     * Visible accounts on the Accounts page (excludes closed accounts unless `showClosedAccounts` is enabled).
     */
    readonly visiblePortfolioAccounts = computed<Array<IAccount>>(() => {
        const all = this.accounts();
        if (this.showClosedAccounts()) {
            return all;
        }
        return all.filter(a => a.isActive !== false);
    });

    /**
     * Up to 4 starred account IDs, resolved from user settings or account `isFavorite` flags / primary account ID.
     */
    readonly starredAccountIds = computed<Array<string>>(() => {
        const allAccounts = this.visiblePortfolioAccounts();
        const validIds = new Set(allAccounts.map(a => a.id));

        const override = this.starredIdsOverride();
        if (override !== null) {
            return override
                .filter(id => validIds.has(id))
                .slice(0, AccountsPageComponent.MAX_STARRED_ACCOUNTS);
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
                    return Array.from(new Set(savedIds)).slice(
                        0,
                        AccountsPageComponent.MAX_STARRED_ACCOUNTS
                    );
                }
            } catch {
                // Fall through to account flags and primaryAccountId fallback
            }
        }

        const derived: Array<string> = [];
        const primaryId = this.primaryAccountId ? this.primaryAccountId() : null;
        if (primaryId && validIds.has(primaryId)) {
            derived.push(primaryId);
        }
        for (const acc of allAccounts) {
            if (acc.isFavorite && !derived.includes(acc.id)) {
                derived.push(acc.id);
            }
        }
        return derived.slice(0, AccountsPageComponent.MAX_STARRED_ACCOUNTS);
    });

    /**
     * Starred accounts (up to 4) displayed at the top of the page.
     */
    readonly starredAccounts = computed<Array<IAccount>>(() => {
        const ids = this.starredAccountIds();
        if (ids.length === 0) return [];
        const byId = new Map(this.visiblePortfolioAccounts().map(a => [a.id, a]));
        return ids.map(id => byId.get(id)).filter((a): a is IAccount => a !== undefined);
    });

    readonly canStarMoreAccounts = computed<boolean>(
        () => this.starredAccountIds().length < AccountsPageComponent.MAX_STARRED_ACCOUNTS
    );

    /**
     * Accounts not currently pinned in the top Starred Accounts section.
     */
    readonly unstarredAccounts = computed<Array<IAccount>>(() => {
        const starredSet = new Set(this.starredAccountIds());
        return this.visiblePortfolioAccounts().filter(a => !starredSet.has(a.id));
    });

    /**
     * Responsive 2-across layout when there are more than 1 account in a section.
     */
    readonly isTwoColumnGrid = computed<boolean>(() => this.visiblePortfolioAccounts().length > 1);

    readonly accountGridClass = computed<string>(() =>
        this.isTwoColumnGrid()
            ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start'
            : 'grid grid-cols-1 gap-3.5 items-start'
    );

    /**
     * Accounts grouped by Path Logic AccountType for the main portfolio feed.
     */
    readonly accountTypeGroups = computed<Array<IAccountTypePortfolioGroup>>(() => {
        const sourceAccounts = this.unstarredAccounts();
        const byType = new Map<AccountType, Array<IAccount>>();
        for (const acc of sourceAccounts) {
            const list = byType.get(acc.type) ?? [];
            list.push(acc);
            byType.set(acc.type, list);
        }

        const groups: Array<IAccountTypePortfolioGroup> = [];
        for (const entry of ACCOUNT_TYPE_ORDER) {
            const list = byType.get(entry.type);
            if (!list || list.length === 0) continue;
            const totalBalance = list.reduce((sum, acc) => sum + this.getEffectiveBalance(acc), 0);
            groups.push({
                type: entry.type,
                label: entry.label,
                icon: this.getAccountIcon(entry.type),
                badgeClass: this.getAccountBadgeClass(entry.type),
                accounts: list,
                totalBalance,
                isLiability: this.isLiability(entry.type)
            });
        }
        return groups;
    });

    /**
     * Per-section card expansion and layout helpers:
     * - 1 card: full width (`1-col` / `md:col-span-2`)
     * - 2 cards: 2-column wrapped (`2-col`)
     * - 3 cards: 1 card full width on row 1, then 2 cards across on row 2 (`1-then-2`)
     * - 4+ cards: 2-column wrapped (`2-col`), hiding cards past the 4th behind an expansion toggle
     */
    isSectionCardsExpanded(sectionKey: string): boolean {
        return !!this.expandedSectionCards()[sectionKey];
    }

    toggleSectionCardsExpand(sectionKey: string): void {
        this.expandedSectionCards.update(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }));
    }

    getVisibleSectionAccounts(accounts: Array<IAccount>, sectionKey: string): Array<IAccount> {
        if (accounts.length <= 4 || this.isSectionCardsExpanded(sectionKey)) {
            return accounts;
        }
        return accounts.slice(0, 4);
    }

    getHiddenSectionAccountCount(accounts: Array<IAccount>): number {
        return Math.max(0, accounts.length - 4);
    }

    getSectionLayoutMode(visibleCount: number): '1-col' | '2-col' | '1-then-2' {
        if (visibleCount <= 1) return '1-col';
        if (visibleCount === 3) return '1-then-2';
        return '2-col';
    }

    getSectionGridClass(visibleCount: number): string {
        if (visibleCount <= 1) {
            return 'grid grid-cols-1 gap-3.5 items-start';
        }
        return 'grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start';
    }

    getCardSpanClass(index: number, visibleCount: number): string {
        if (visibleCount <= 1) {
            return 'md:col-span-2 w-full';
        }
        if (visibleCount === 3 && index === 0) {
            return 'md:col-span-2 w-full';
        }
        return 'md:col-span-1 w-full';
    }

    toggleShowClosedAccounts(): void {
        this.showClosedAccounts.update(v => !v);
    }

    getEffectiveBalance(account: IAccount): number {
        return account.pendingBalance ?? account.clearedBalance;
    }

    isZeroBalance(account: IAccount): boolean {
        return account.clearedBalance === 0 && account.pendingBalance === 0;
    }

    isAccountStarred(accountId: string): boolean {
        return this.starredAccountIds().includes(accountId);
    }

    async toggleStarAccount(accountId: string): Promise<void> {
        const current = [...this.starredAccountIds()];
        const existingIdx = current.indexOf(accountId);
        let isNowStarred = false;

        if (existingIdx >= 0) {
            current.splice(existingIdx, 1);
            isNowStarred = false;
        } else {
            if (current.length >= AccountsPageComponent.MAX_STARRED_ACCOUNTS) {
                return;
            }
            current.push(accountId);
            isNowStarred = true;
        }

        this.starredIdsOverride.set(current);

        const serialized = JSON.stringify(current);
        const settingsStore = this.userSettingsStore as {
            updateSetting?: (k: string, v: string) => Promise<void>;
            setSetting?: (k: string, v: string) => Promise<void>;
            setPrimaryAccountId?: (id: string | null) => Promise<void>;
        };
        if (typeof settingsStore.updateSetting === 'function') {
            await settingsStore.updateSetting(STARRED_ACCOUNTS_SETTING_KEY, serialized);
        } else if (typeof settingsStore.setSetting === 'function') {
            await settingsStore.setSetting(STARRED_ACCOUNTS_SETTING_KEY, serialized);
        }

        if (typeof settingsStore.setPrimaryAccountId === 'function') {
            await settingsStore.setPrimaryAccountId(current[0] ?? null);
        }

        const targetAcc = this.accounts().find(a => a.id === accountId);
        const storeWithUpdate = this.ledgerStore as {
            updateAccount?: (acc: IAccount) => Promise<void>;
        };
        if (targetAcc && typeof storeWithUpdate.updateAccount === 'function') {
            await storeWithUpdate.updateAccount({
                ...targetAcc,
                isFavorite: isNowStarred
            });
        }
    }

    async togglePrimaryAccount(accountId: string): Promise<void> {
        await this.toggleStarAccount(accountId);
    }

    toggleGroupByType(): void {
        this.groupByType.update(v => !v);
    }

    toggleTypeGroupCollapse(type: AccountType): void {
        this.collapsedTypeGroups.update(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    }

    isTypeGroupCollapsed(type: AccountType): boolean {
        return !!this.collapsedTypeGroups()[type];
    }

    formatGroupBalance(group: IAccountTypePortfolioGroup): string {
        if (group.isLiability) {
            return Money.formatCurrency(Math.abs(group.totalBalance));
        }
        return Money.formatCurrency(group.totalBalance);
    }

    readonly pendingCrossAccountCount = computed<number>(() => {
        return this.augmentationService
            ? this.augmentationService.getAllPendingOpportunities().length
            : 0;
    });

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

        effect(() => {
            const tools = this.sidebarTools();
            if (tools && this.sidebarContext) {
                this.sidebarContext.setContext(tools);
            }
        });

        effect(() => {
            const accs = this.accounts();
            const txs = this.transactions ? this.transactions() : [];
            if (
                this.augmentationService &&
                accs.length > 0 &&
                !this.augmentationService.intelligenceReport()
            ) {
                untracked(() => {
                    this.augmentationService?.analyzeLedgerAccounts(accs, txs, false);
                });
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

    ngOnDestroy(): void {
        this.sidebarContext?.clearContext();
    }

    toggleActionsMenu(): void {
        this.isActionsMenuOpen.update(v => !v);
    }

    closeActionsMenu(): void {
        this.isActionsMenuOpen.set(false);
    }

    openCrossAccountReconciliationWizard(): void {
        this.isActionsMenuOpen.set(false);
        this.augmentationService?.openWorkspaceReconciliationWizard();
    }

    openAiAccountSummary(): void {
        this.isActionsMenuOpen.set(false);
        if (this.augmentationService) {
            if (!this.augmentationService.intelligenceReport()) {
                this.augmentationService.analyzeLedgerAccounts(undefined, undefined, true);
            } else {
                this.augmentationService.isNotificationDialogOpen.set(true);
            }
        }
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
        const raw = this.getEffectiveBalance(account);
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
