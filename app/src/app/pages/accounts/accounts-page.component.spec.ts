import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountType, type IAccount } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../services/auth/auth.service';
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
        primaryAccountId: signal('acc-1'),
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
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync },
                { provide: LedgerStore, useValue: mockStore },
                { provide: UserSettingsStore, useValue: mockUserSettings }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountsPageComponent);
        component = fixture.componentInstance;
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
});
