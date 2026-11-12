import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AccountType, type IAccount } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../services/auth/auth.service';
import { AccountAugmentationService } from '../../services/import-export/account-augmentation.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { AccountsPageComponent } from './accounts-page.component';

describe('AccountsPageComponent', () => {
    let component: AccountsPageComponent;
    let fixture: ComponentFixture<AccountsPageComponent>;

    const mockAccounts = signal<Array<IAccount>>([
        {
            id: 'acc-1',
            name: 'Primary Checking',
            institutionName: 'Chase',
            type: AccountType.Checking,
            clearedBalance: 150000,
            pendingBalance: 150000,
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            deletedAt: null
        }
    ]);

    const mockStore = {
        accounts: mockAccounts,
        trashedAccounts: signal([]),
        transactions: signal([]),
        schedules: signal([]),
        payees: signal([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal([]),
        mergeCount: signal(0)
    };

    const mockUserSettings = {
        settings: signal({}),
        primaryAccountId: signal<string | null>('acc-1'),
        setPrimaryAccountId: () => Promise.resolve(),
        getSetting: (_key: string, defaultValue?: string) => defaultValue ?? undefined,
        setSetting: () => Promise.resolve()
    };

    const mockAuth = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@example.com'
        }),
        accessToken: signal(null),
        isGoogleDriveConnected: signal(false)
    };

    const mockSync = {
        isSyncing: signal(false),
        getSyncStatus: () => ({ lastSyncTime: Date.now() })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountsPageComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                AccountAugmentationService,
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync },
                { provide: LedgerStore, useValue: mockStore },
                { provide: UserSettingsStore, useValue: mockUserSettings }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountsPageComponent);
        component = fixture.componentInstance;
        mockAccounts.set([
            {
                id: 'acc-1',
                name: 'Primary Checking',
                institutionName: 'Chase',
                type: AccountType.Checking,
                clearedBalance: 150000,
                pendingBalance: 150000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            }
        ]);
        mockUserSettings.primaryAccountId.set('acc-1');
        fixture.detectChanges();
    });

    it('should create the accounts page component', () => {
        expect(component).toBeTruthy();
    });

    it('should render skeleton UI while loading', () => {
        mockStore.isLoading.set(true);
        fixture.detectChanges();

        expect(component.isLoading()).toBe(true);
        const skeletons = fixture.nativeElement.querySelectorAll('app-skeleton');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render actual accounts content when loading is complete', () => {
        mockStore.isLoading.set(false);
        mockStore.isInitialized.set(true);
        fixture.detectChanges();

        expect(component.isLoading()).toBe(false);
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Accounts');
        expect(text).toContain('Primary Checking');
    });

    it('should expand account card when clicked to reveal metadata and delete button', () => {
        mockStore.isLoading.set(false);
        mockStore.isInitialized.set(true);
        fixture.detectChanges();

        const card = fixture.nativeElement.querySelector('div[role="button"]') as HTMLElement;
        expect(card).toBeTruthy();
        expect(component.expandedId()).toBeNull();

        // Click card to expand
        card.click();
        fixture.detectChanges();

        expect(component.expandedId()).toBe('acc-1');
        expect(fixture.nativeElement.textContent).toContain('Account Type');
        expect(fixture.nativeElement.textContent).toContain('Cleared Balance');

        const deleteBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Delete Account"]'
        ) as HTMLButtonElement;
        expect(deleteBtn).toBeTruthy();
    });

    it('should open delete confirmation modal when Delete Account button is clicked', () => {
        mockStore.isLoading.set(false);
        mockStore.isInitialized.set(true);
        component.expandedId.set('acc-1');
        fixture.detectChanges();

        const deleteBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Delete Account"]'
        ) as HTMLButtonElement;
        expect(deleteBtn).toBeTruthy();

        deleteBtn.click();
        fixture.detectChanges();

        expect(component.isDeleteConfirmOpen()).toBe(true);
        expect(component.pendingDeleteId()).toBe('acc-1');
        expect(fixture.nativeElement.textContent).toContain('Move Account to Trash?');
    });

    it('should show View Ledger in header when collapsed, and slide it to bottom with delete icon in header when expanded', () => {
        mockStore.isLoading.set(false);
        mockStore.isInitialized.set(true);
        fixture.detectChanges();

        // 1. In collapsed state:
        expect(component.expandedId()).toBeNull();
        expect(
            fixture.nativeElement.querySelector('button[aria-label="Delete Account"]')
        ).toBeNull();

        const collapsedLedgerBtn = fixture.nativeElement.querySelector(
            'a[aria-label="View ledger for Primary Checking"]'
        ) as HTMLAnchorElement;
        expect(collapsedLedgerBtn).toBeTruthy();

        // 2. Expand the card
        const card = fixture.nativeElement.querySelector('div[role="button"]') as HTMLElement;
        card.click();
        fixture.detectChanges();

        expect(component.expandedId()).toBe('acc-1');

        // Delete icon button is now present in top right
        const deleteIconBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Delete Account"]'
        ) as HTMLButtonElement;
        expect(deleteIconBtn).toBeTruthy();
        expect(deleteIconBtn.querySelector('.pi-trash')).toBeTruthy();

        // View Ledger button is now in the expanded drawer (at the bottom)
        const expandedLedgerBtn = fixture.nativeElement.querySelector(
            'a[aria-label="View ledger for Primary Checking"]'
        ) as HTMLAnchorElement;
        expect(expandedLedgerBtn).toBeTruthy();
        expect(expandedLedgerBtn.getAttribute('href')).toBe('/accounts/acc-1');
    });

    it('should open the Reconcile & Augment menu and launch the Cross-Account Reconciliation Wizard', () => {
        mockStore.isLoading.set(false);
        mockStore.isInitialized.set(true);
        fixture.detectChanges();

        const triggerBtn = fixture.nativeElement.querySelector(
            '[data-testid="accounts-reconcile-menu-trigger"]'
        ) as HTMLButtonElement;
        expect(triggerBtn).toBeTruthy();

        triggerBtn.click();
        fixture.detectChanges();

        const menuItem = fixture.nativeElement.querySelector(
            '[data-testid="launch-cross-account-wizard-menu-item"]'
        ) as HTMLButtonElement;
        expect(menuItem).toBeTruthy();

        menuItem.click();
        fixture.detectChanges();

        const augmentationService = TestBed.inject(AccountAugmentationService);
        expect(augmentationService.isWizardOpen()).toBe(true);
        expect(component.isActionsMenuOpen()).toBe(false);
    });

    it('should allow starring up to 4 accounts at the top of the page and enforce the 4-account limit', async () => {
        mockAccounts.set([
            {
                id: 'acc-1',
                name: 'Main Checking',
                institutionName: 'Chase',
                type: AccountType.Checking,
                clearedBalance: 100000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-2',
                name: 'Emergency Savings',
                institutionName: 'Ally',
                type: AccountType.Savings,
                clearedBalance: 500000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-3',
                name: 'Sapphire Reserve',
                institutionName: 'Chase',
                type: AccountType.Credit,
                clearedBalance: -25000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-4',
                name: 'Home Mortgage',
                institutionName: 'Wells Fargo',
                type: AccountType.Mortgage,
                clearedBalance: -25000000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-5',
                name: 'Auto Loan',
                institutionName: 'Toyota Financial',
                type: AccountType.AutoLoan,
                clearedBalance: -1800000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            }
        ]);
        mockUserSettings.primaryAccountId.set('acc-1');
        fixture.detectChanges();

        // Initially acc-1 is starred via primaryAccountId
        expect(component.starredAccounts().map(a => a.id)).toEqual(['acc-1']);
        const starredSection = fixture.nativeElement.querySelector(
            '[data-testid="starred-accounts-section"]'
        ) as HTMLElement;
        expect(starredSection).toBeTruthy();
        expect(starredSection.textContent).toContain('Main Checking');

        // Star 3 more accounts (acc-2, acc-3, acc-4) to reach max of 4
        await component.toggleStarAccount('acc-2');
        await component.toggleStarAccount('acc-3');
        await component.toggleStarAccount('acc-4');
        fixture.detectChanges();

        expect(component.starredAccounts().length).toBe(4);
        expect(component.canStarMoreAccounts()).toBe(false);

        // Attempting to star a 5th account (acc-5) is blocked and button is disabled
        const fifthStarBtn = fixture.nativeElement.querySelector(
            '[data-testid="star-account-btn-acc-5"]'
        ) as HTMLButtonElement;
        expect(fifthStarBtn).toBeTruthy();
        expect(fifthStarBtn.disabled).toBe(true);

        await component.toggleStarAccount('acc-5');
        fixture.detectChanges();
        expect(component.starredAccounts().length).toBe(4);
        expect(component.isAccountStarred('acc-5')).toBe(false);

        // Unstarring acc-2 allows acc-5 to be starred
        await component.toggleStarAccount('acc-2');
        fixture.detectChanges();
        expect(component.starredAccounts().length).toBe(3);
        expect(component.canStarMoreAccounts()).toBe(true);
    });

    it('should group unstarred accounts by AccountType and allow toggling group-by-type mode', () => {
        mockAccounts.set([
            {
                id: 'acc-1',
                name: 'Main Checking',
                institutionName: 'Chase',
                type: AccountType.Checking,
                clearedBalance: 100000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-2',
                name: 'Secondary Checking',
                institutionName: 'SoFi',
                type: AccountType.Checking,
                clearedBalance: 50000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-3',
                name: 'High Yield Savings',
                institutionName: 'Ally',
                type: AccountType.Savings,
                clearedBalance: 500000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-4',
                name: 'Travel Credit Card',
                institutionName: 'Chase',
                type: AccountType.Credit,
                clearedBalance: -35000,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            }
        ]);
        mockUserSettings.primaryAccountId.set(null);
        fixture.detectChanges();

        expect(component.groupByType()).toBe(true);
        const groups = component.accountTypeGroups();
        expect(groups.map(g => g.type)).toEqual([
            AccountType.Checking,
            AccountType.Savings,
            AccountType.Credit
        ]);
        expect(groups[0]?.accounts.length).toBe(2);

        const checkingGroupEl = fixture.nativeElement.querySelector(
            `[data-testid="account-type-group-${AccountType.Checking}"]`
        ) as HTMLElement;
        expect(checkingGroupEl).toBeTruthy();

        // Collapse Checking group
        const checkingHeaderBtn = fixture.nativeElement.querySelector(
            `[data-testid="account-type-header-${AccountType.Checking}"]`
        ) as HTMLButtonElement;
        checkingHeaderBtn.click();
        fixture.detectChanges();
        expect(component.isTypeGroupCollapsed(AccountType.Checking)).toBe(true);

        // Toggle off Group by Type to switch to flat view
        const groupToggleBtn = fixture.nativeElement.querySelector(
            '[data-testid="accounts-group-by-type-toggle"]'
        ) as HTMLButtonElement;
        expect(groupToggleBtn).toBeTruthy();
        groupToggleBtn.click();
        fixture.detectChanges();

        expect(component.groupByType()).toBe(false);
        expect(
            fixture.nativeElement.querySelector('[data-testid="accounts-flat-grid"]')
        ).toBeTruthy();
    });

    it('should apply per-section layout rules (1 full-width, 2 wrapped, 3 as 1-then-2, 4+ wrapped with expansion past 4th)', async () => {
        mockAccounts.set([
            {
                id: 'acc-1',
                name: 'Starred 1',
                institutionName: 'Bank',
                type: AccountType.Checking,
                clearedBalance: 10000,
                pendingBalance: 10000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-2',
                name: 'Checking 2',
                institutionName: 'Bank',
                type: AccountType.Checking,
                clearedBalance: 20000,
                pendingBalance: 20000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-3',
                name: 'Checking 3',
                institutionName: 'Bank',
                type: AccountType.Checking,
                clearedBalance: 30000,
                pendingBalance: 30000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-4',
                name: 'Checking 4',
                institutionName: 'Bank',
                type: AccountType.Checking,
                clearedBalance: 40000,
                pendingBalance: 40000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-5',
                name: 'Checking 5',
                institutionName: 'Bank',
                type: AccountType.Checking,
                clearedBalance: 50000,
                pendingBalance: 50000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-6',
                name: 'Checking 6',
                institutionName: 'Bank',
                type: AccountType.Checking,
                clearedBalance: 60000,
                pendingBalance: 60000,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            }
        ]);
        mockUserSettings.primaryAccountId.set('acc-1');
        fixture.detectChanges();

        // 1 starred account -> full width (1-col), no count label, no Starred badge on card
        expect(
            fixture.nativeElement.querySelector('[data-testid="starred-accounts-count"]')
        ).toBeNull();
        expect(
            fixture.nativeElement.querySelector('[data-testid="starred-account-badge-acc-1"]')
        ).toBeNull();
        const starredGrid1 = fixture.nativeElement.querySelector(
            '[data-testid="starred-accounts-grid"]'
        ) as HTMLElement;
        expect(starredGrid1.getAttribute('data-layout')).toBe('1-col');

        // 5 unstarred Checking accounts -> 2-col wrapped, showing 4 cards initially with expansion button hiding the 5th
        const checkingGrid = fixture.nativeElement.querySelector(
            `[data-testid="account-type-grid-${AccountType.Checking}"]`
        ) as HTMLElement;
        expect(checkingGrid.getAttribute('data-layout')).toBe('2-col');
        expect(checkingGrid.querySelectorAll('[role="button"]').length).toBe(4);

        const expandBtn = fixture.nativeElement.querySelector(
            `[data-testid="expand-cards-btn-${AccountType.Checking}"]`
        ) as HTMLButtonElement;
        expect(expandBtn).toBeTruthy();
        expect(expandBtn.textContent).toContain('Show 1 more account');

        expandBtn.click();
        fixture.detectChanges();
        expect(checkingGrid.querySelectorAll('[role="button"]').length).toBe(5);

        // Star 2 more accounts (total 3 starred) -> 1-then-2 layout (first card col-span-2, next two col-span-1)
        await component.toggleStarAccount('acc-2');
        await component.toggleStarAccount('acc-3');
        fixture.detectChanges();

        expect(starredGrid1.getAttribute('data-layout')).toBe('1-then-2');
        const slot0 = fixture.nativeElement.querySelector(
            '[data-testid="starred-card-slot-0"]'
        ) as HTMLElement;
        const slot1 = fixture.nativeElement.querySelector(
            '[data-testid="starred-card-slot-1"]'
        ) as HTMLElement;
        const slot2 = fixture.nativeElement.querySelector(
            '[data-testid="starred-card-slot-2"]'
        ) as HTMLElement;
        expect(slot0.className).toContain('md:col-span-2');
        expect(slot1.className).toContain('md:col-span-1');
        expect(slot2.className).toContain('md:col-span-1');
    });

    it('should hide closed accounts by default unless Show Closed filter is toggled, and style $0.00 accounts specially', () => {
        mockAccounts.set([
            {
                id: 'acc-open-zero',
                name: 'Zero Balance Checking',
                institutionName: 'Chase',
                type: AccountType.Checking,
                clearedBalance: 0,
                pendingBalance: 0,
                isActive: true,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            },
            {
                id: 'acc-closed',
                name: 'Legacy Closed Loan',
                institutionName: 'Ford Credit',
                type: AccountType.AutoLoan,
                clearedBalance: 0,
                pendingBalance: 0,
                isActive: false,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                deletedAt: null
            }
        ]);
        mockUserSettings.primaryAccountId.set(null);
        fixture.detectChanges();

        // Closed account hidden by default
        expect(component.visiblePortfolioAccounts().map(a => a.id)).toEqual(['acc-open-zero']);
        expect(fixture.nativeElement.textContent).not.toContain('Legacy Closed Loan');

        // $0.00 account has special zero-balance badge and attribute
        const zeroCard = fixture.nativeElement.querySelector(
            '[data-testid="account-card-acc-open-zero"]'
        ) as HTMLElement;
        expect(zeroCard.getAttribute('data-zero-balance')).toBe('true');
        expect(
            fixture.nativeElement.querySelector('[data-testid="zero-balance-badge-acc-open-zero"]')
        ).toBeTruthy();

        // Toggle Show Closed filter on
        const showClosedBtn = fixture.nativeElement.querySelector(
            '[data-testid="accounts-show-closed-toggle"]'
        ) as HTMLButtonElement;
        expect(showClosedBtn).toBeTruthy();
        showClosedBtn.click();
        fixture.detectChanges();

        expect(component.showClosedAccounts()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Legacy Closed Loan');
        expect(
            fixture.nativeElement.querySelector('[data-testid="closed-account-badge-acc-closed"]')
        ).toBeTruthy();
    });

    it('should render the 90d History + 30d Forecast telemetry strip inside an expanded account drawer', () => {
        component.toggleExpand('acc-1');
        fixture.detectChanges();

        const drawerTelemetry = fixture.nativeElement.querySelector(
            '[data-testid="account-drawer-telemetry-acc-1"]'
        ) as HTMLElement;
        expect(drawerTelemetry).toBeTruthy();
        expect(drawerTelemetry.textContent).toContain('90d History + 30d Forecast');
        expect(drawerTelemetry.querySelector('svg')).toBeTruthy();
    });
});
