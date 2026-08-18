import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import type { IPayee, IRecurringSchedule, ITransaction } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { PayeesPageComponent } from './payees-page.component';

describe('PayeesPageComponent', () => {
    let component: PayeesPageComponent;
    let fixture: ComponentFixture<PayeesPageComponent>;

    const mockPayees = signal<Array<IPayee>>([
        {
            id: 'p-1',
            name: 'Starbucks #1234',
            address: '123 Main St',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: null,
            defaultCategoryId: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        },
        {
            id: 'p-2',
            name: 'Starbucks',
            address: null,
            city: 'Austin',
            state: 'TX',
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            notes: null,
            defaultCategoryId: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    ]);

    const mockTransactions = signal<Array<ITransaction>>([]);
    const mockSchedules = signal<Array<IRecurringSchedule>>([]);

    const mockLedgerStore = {
        payees: mockPayees,
        transactions: mockTransactions,
        schedules: mockSchedules,
        accounts: signal([]),
        isInitialized: signal(true),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal([]),
        mergeCount: signal(0),
        mergePayees: vi.fn().mockResolvedValue({ affectedTransactions: 0, affectedSchedules: 0 })
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
            imports: [PayeesPageComponent],
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                { provide: AuthService, useValue: mockAuth },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSync }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PayeesPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create PayeesPageComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should filter payees based on search query', () => {
        expect(component.filteredPayees().length).toBe(2);

        component.searchQuery.set('#1234');
        expect(component.filteredPayees().length).toBe(1);
        expect(component.filteredPayees()[0]?.name).toBe('Starbucks #1234');
    });

    it('should expand and collapse payee details', () => {
        expect(component.expandedId()).toBeNull();

        component.toggleExpand('p-1');
        expect(component.expandedId()).toBe('p-1');

        component.toggleExpand('p-1');
        expect(component.expandedId()).toBeNull();
    });

    it('should open merge dialog and preselect source payee on desktop viewports', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        expect(component.isMergeDialogOpen()).toBe(false);

        component.openMergePayees('p-1');
        expect(component.isMergeDialogOpen()).toBe(true);
        expect(component.preselectedMergeSourceId()).toBe('p-1');
    });

    it('should NOT open merge dialog on mobile viewports (< 768px)', () => {
        Object.defineProperty(window, 'innerWidth', { value: 390, writable: true });
        component.isMergeDialogOpen.set(false);

        component.openMergePayees('p-1');
        expect(component.isMergeDialogOpen()).toBe(false);
    });

    it('should include or completely exclude merge buttons from DOM based on isMediumOrLarge signal', () => {
        component.isMediumOrLarge.set(true);
        fixture.detectChanges();
        let mergeHeaderBtn = fixture.nativeElement.querySelector('button i.pi-clone');
        expect(mergeHeaderBtn).toBeTruthy();

        component.isMediumOrLarge.set(false);
        fixture.detectChanges();
        mergeHeaderBtn = fixture.nativeElement.querySelector('button i.pi-clone');
        expect(mergeHeaderBtn).toBeNull();
    });

    it('should close expanded rows when merge completes', () => {
        component.expandedId.set('p-1');
        component.handlePayeesMerged();
        expect(component.expandedId()).toBeNull();
    });
});
