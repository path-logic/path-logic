import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevMaintenanceComponent, DevMaintenanceStorageService } from './dev-maintenance.component';
import {
    CategoriesTab,
    Default,
    InteractiveExplorer,
    mockAccounts,
    mockAuthService,
    mockCategories,
    mockLedgerStore,
    mockPayees,
    mockSecurityManager,
    mockStorageService,
    mockSyncService,
    PayeesTab
} from './dev-maintenance.component.stories';

describe('DevMaintenanceComponent (Storybook Stories)', () => {
    beforeEach(async () => {
        mockAccounts.set([
            { id: 'acc-1', name: 'Primary Checking', type: 'Checking', isActive: true },
            { id: 'acc-2', name: 'High Yield Savings', type: 'Savings', isActive: true },
            { id: 'acc-3', name: 'Legacy Card', type: 'Credit', isActive: false }
        ]);
        mockPayees.set([
            { id: 'payee-1', name: 'Austin Energy', notes: 'Monthly utility' },
            { id: 'payee-2', name: 'Google Fiber', notes: 'Internet service' }
        ]);
        mockCategories.set([
            { id: 'cat-1', name: 'Housing', description: 'Rent & Mortgage', parentId: null },
            {
                id: 'cat-2',
                name: 'Utilities',
                description: 'Electric, Gas, Water',
                parentId: 'cat-1'
            }
        ]);

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
    });

    it('renders Default story and executes play function', async () => {
        const fixture: ComponentFixture<DevMaintenanceComponent> =
            TestBed.createComponent(DevMaintenanceComponent);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Primary Checking');
    });

    it('renders PayeesTab story and executes play function', async () => {
        const fixture: ComponentFixture<DevMaintenanceComponent> =
            TestBed.createComponent(DevMaintenanceComponent);
        fixture.detectChanges();

        await PayeesTab.play?.({ canvasElement: fixture.nativeElement } as any);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Austin Energy');
    });

    it('renders CategoriesTab story and executes play function', async () => {
        const fixture: ComponentFixture<DevMaintenanceComponent> =
            TestBed.createComponent(DevMaintenanceComponent);
        fixture.detectChanges();

        await CategoriesTab.play?.({ canvasElement: fixture.nativeElement } as any);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Housing');
    });

    it('executes InteractiveExplorer story play function', async () => {
        const fixture: ComponentFixture<DevMaintenanceComponent> =
            TestBed.createComponent(DevMaintenanceComponent);
        fixture.detectChanges();

        await InteractiveExplorer.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_name: string, fn: () => Promise<void>) => {
                await fn();
                fixture.detectChanges();
            }
        } as any);

        expect(fixture.nativeElement.textContent).toContain('Primary Checking');
    }, 15000);
});
