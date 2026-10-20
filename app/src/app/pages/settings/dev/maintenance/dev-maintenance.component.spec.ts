import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevMaintenanceComponent, DevMaintenanceStorageService } from './dev-maintenance.component';

describe('DevMaintenanceComponent', () => {
    let component: DevMaintenanceComponent;
    let fixture: ComponentFixture<DevMaintenanceComponent>;

    let mockAccessToken: WritableSignal<string | null>;
    let mockIsInitialized: WritableSignal<boolean>;
    let mockAccounts: WritableSignal<Array<any>>;
    let mockPayees: WritableSignal<Array<any>>;
    let mockCategories: WritableSignal<Array<any>>;

    let mockAuthService: {
        accessToken: WritableSignal<string | null>;
        currentUser: WritableSignal<any>;
        isLoggedIn: WritableSignal<boolean>;
    };

    let mockLedgerStore: {
        isInitialized: WritableSignal<boolean>;
        initialize: ReturnType<typeof vi.fn>;
        reset: ReturnType<typeof vi.fn>;
        accounts: WritableSignal<Array<any>>;
        payees: WritableSignal<Array<any>>;
        categories: WritableSignal<Array<any>>;
        transactions: WritableSignal<Array<any>>;
        schedules: WritableSignal<Array<any>>;
        syncStatus: WritableSignal<string>;
        authError: WritableSignal<boolean>;
        hasLocalFallback: WritableSignal<boolean>;
        syncConflicts: WritableSignal<Array<any>>;
        mergeCount: WritableSignal<number>;
    };

    let mockSecurityManager: {
        isIdle: WritableSignal<boolean>;
        startMonitoring: ReturnType<typeof vi.fn>;
        resetTimers: ReturnType<typeof vi.fn>;
    };

    let mockSyncService: {
        isSyncing: WritableSignal<boolean>;
        getSyncStatus: ReturnType<typeof vi.fn>;
    };

    let mockStorageService: {
        factoryResetDrive: ReturnType<typeof vi.fn>;
        clearLocalSnapshot: ReturnType<typeof vi.fn>;
        softDeleteAccount: ReturnType<typeof vi.fn>;
        deletePayee: ReturnType<typeof vi.fn>;
        deleteCategory: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        vi.restoreAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        mockStorageService = {
            factoryResetDrive: vi.fn().mockResolvedValue(undefined),
            clearLocalSnapshot: vi.fn().mockResolvedValue(undefined),
            softDeleteAccount: vi.fn(),
            deletePayee: vi.fn(),
            deleteCategory: vi.fn()
        };

        mockAccessToken = signal<string | null>('valid-token-1234');
        mockIsInitialized = signal<boolean>(true);
        mockAccounts = signal<Array<any>>([
            { id: 'acc-1', name: 'Checking Account', type: 'Checking', isActive: true },
            { id: 'acc-2', name: 'Old Credit Card', type: 'Credit', isActive: false }
        ]);
        mockPayees = signal<Array<any>>([
            { id: 'payee-1', name: 'Central Electric', notes: 'Monthly Utility' }
        ]);
        mockCategories = signal<Array<any>>([
            { id: 'cat-1', name: 'Utilities', description: 'Power & Gas', parentId: null }
        ]);

        mockAuthService = {
            accessToken: mockAccessToken,
            currentUser: signal<any>({ uid: 'test-user', email: 'dev@pathlogic.io' }),
            isLoggedIn: signal<boolean>(true)
        };

        mockLedgerStore = {
            isInitialized: mockIsInitialized,
            initialize: vi.fn().mockResolvedValue(undefined),
            reset: vi.fn(),
            accounts: mockAccounts,
            payees: mockPayees,
            categories: mockCategories,
            transactions: signal<Array<any>>([]),
            schedules: signal<Array<any>>([]),
            syncStatus: signal<string>('synced'),
            authError: signal<boolean>(false),
            hasLocalFallback: signal<boolean>(true),
            syncConflicts: signal<Array<any>>([]),
            mergeCount: signal<number>(0)
        };

        mockSecurityManager = {
            isIdle: signal<boolean>(false),
            startMonitoring: vi.fn(),
            resetTimers: vi.fn()
        };

        mockSyncService = {
            isSyncing: signal<boolean>(false),
            getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: Date.now() })
        };

        await TestBed.configureTestingModule({
            imports: [DevMaintenanceComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService },
                { provide: DevMaintenanceStorageService, useValue: mockStorageService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DevMaintenanceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the DevMaintenanceComponent', () => {
        expect(component).toBeTruthy();
        expect(component.activeTab()).toBe('accounts');
        expect(component.isResetting()).toBe(false);
        expect(component.resetSuccess()).toBeNull();
    });

    it('should trigger ledgerStore.initialize when entering if store is not initialized', async () => {
        mockIsInitialized.set(false);
        const fixtureUninit = TestBed.createComponent(DevMaintenanceComponent);
        fixtureUninit.detectChanges();

        expect(mockLedgerStore.initialize).toHaveBeenCalled();
    });

    it('should execute full factory reset when token is present and user confirms', async () => {
        await component.handleFactoryReset();
        fixture.detectChanges();

        expect(window.confirm).toHaveBeenCalled();
        expect(mockStorageService.factoryResetDrive).toHaveBeenCalledWith('valid-token-1234');
        expect(mockStorageService.clearLocalSnapshot).toHaveBeenCalled();
        expect(mockLedgerStore.reset).toHaveBeenCalled();
        expect(component.resetSuccess()).toBe(true);
        expect(component.wasPartial()).toBe(false);
        expect(component.isResetting()).toBe(false);

        expect(fixture.nativeElement.textContent).toContain('Environment wiped successfully');
    });

    it('should perform partial wipe when no access token is available', async () => {
        mockAccessToken.set(null);

        await component.handleFactoryReset();
        fixture.detectChanges();

        expect(mockStorageService.factoryResetDrive).not.toHaveBeenCalled();
        expect(mockStorageService.clearLocalSnapshot).toHaveBeenCalled();
        expect(mockLedgerStore.reset).toHaveBeenCalled();
        expect(component.resetSuccess()).toBe(true);
        expect(component.wasPartial()).toBe(true);

        expect(fixture.nativeElement.textContent).toContain('Local wipe complete');
        expect(fixture.nativeElement.textContent).toContain(
            'Cloud skip: Auth error or connection lost.'
        );
    });

    it('should perform partial wipe when factoryResetDrive rejects', async () => {
        mockStorageService.factoryResetDrive.mockRejectedValueOnce(
            new Error('Cloud connection failed')
        );

        await component.handleFactoryReset();
        fixture.detectChanges();

        expect(mockStorageService.factoryResetDrive).toHaveBeenCalled();
        expect(mockStorageService.clearLocalSnapshot).toHaveBeenCalled();
        expect(mockLedgerStore.reset).toHaveBeenCalled();
        expect(component.resetSuccess()).toBe(true);
        expect(component.wasPartial()).toBe(true);
        expect(fixture.nativeElement.textContent).toContain('Local wipe complete');
    });

    it('should handle factory reset error when clearLocalSnapshot fails', async () => {
        mockStorageService.clearLocalSnapshot.mockRejectedValueOnce(new Error('IndexedDB failure'));

        await component.handleFactoryReset();
        fixture.detectChanges();

        expect(component.resetSuccess()).toBe(false);
        expect(component.isResetting()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('Reset failed.');
    });

    it('should cancel factory reset when confirm is rejected', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        await component.handleFactoryReset();

        expect(mockStorageService.factoryResetDrive).not.toHaveBeenCalled();
        expect(mockStorageService.clearLocalSnapshot).not.toHaveBeenCalled();
        expect(mockLedgerStore.reset).not.toHaveBeenCalled();
        expect(component.resetSuccess()).toBeNull();
    });

    it('should execute force wipe local data without calling cloud wipe', async () => {
        await component.handleForceWipeLocal();
        fixture.detectChanges();

        expect(mockStorageService.factoryResetDrive).not.toHaveBeenCalled();
        expect(mockStorageService.clearLocalSnapshot).toHaveBeenCalled();
        expect(mockLedgerStore.reset).toHaveBeenCalled();
        expect(component.resetSuccess()).toBe(true);
    });

    it('should cancel force wipe local data when confirm is rejected', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        await component.handleForceWipeLocal();

        expect(mockStorageService.clearLocalSnapshot).not.toHaveBeenCalled();
        expect(mockLedgerStore.reset).not.toHaveBeenCalled();
        expect(component.resetSuccess()).toBeNull();
    });

    it('should handle force wipe local failure gracefully', async () => {
        mockStorageService.clearLocalSnapshot.mockRejectedValueOnce(new Error('Storage locked'));

        await component.handleForceWipeLocal();
        fixture.detectChanges();

        expect(component.resetSuccess()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('Reset failed.');
    });

    it('should soft delete account and refresh store when confirmed', async () => {
        await component.handleDeleteAccount('acc-1');

        expect(mockStorageService.softDeleteAccount).toHaveBeenCalledWith('acc-1');
        expect(mockLedgerStore.initialize).toHaveBeenCalled();
    });

    it('should not soft delete account when confirm is rejected', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        await component.handleDeleteAccount('acc-1');

        expect(mockStorageService.softDeleteAccount).not.toHaveBeenCalled();
        expect(mockLedgerStore.initialize).not.toHaveBeenCalled();
    });

    it('should delete payee and refresh store when confirmed', async () => {
        await component.handleDeletePayee('payee-1');

        expect(mockStorageService.deletePayee).toHaveBeenCalledWith('payee-1');
        expect(mockLedgerStore.initialize).toHaveBeenCalled();
    });

    it('should delete category and refresh store when confirmed', async () => {
        await component.handleDeleteCategory('cat-1');

        expect(mockStorageService.deleteCategory).toHaveBeenCalledWith('cat-1');
        expect(mockLedgerStore.initialize).toHaveBeenCalled();
    });

    it('should refresh store when refreshStore is called or Refresh State button clicked', () => {
        component.refreshStore();
        expect(mockLedgerStore.initialize).toHaveBeenCalledTimes(1);
    });

    it('should switch tabs between accounts, payees, and categories', () => {
        expect(component.activeTab()).toBe('accounts');
        expect(fixture.nativeElement.textContent).toContain('Checking Account');

        // Switch to payees
        component.activeTab.set('payees');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Central Electric');

        // Switch to categories
        component.activeTab.set('categories');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Utilities');

        // Switch back to accounts
        component.activeTab.set('accounts');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Checking Account');
    });

    it('should display Null Dataset when tables are empty', () => {
        mockAccounts.set([]);
        mockPayees.set([]);
        mockCategories.set([]);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Null Dataset');

        component.activeTab.set('payees');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Null Dataset');

        component.activeTab.set('categories');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Null Dataset');
    });
});
