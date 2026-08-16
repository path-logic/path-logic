import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AccountType, TransactionStatus } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    const mockTransactions = signal([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-01',
            payee: 'Direct Deposit',
            totalAmount: 500000,
            status: TransactionStatus.Cleared,
            splits: []
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-05',
            payee: 'Rent',
            totalAmount: -200000,
            status: TransactionStatus.Cleared,
            splits: []
        }
    ]);

    const mockAccounts = signal([
        {
            id: 'acc-1',
            name: 'Checking',
            institutionName: 'Chase',
            type: AccountType.Checking,
            clearedBalance: 300000,
            pendingBalance: 300000,
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            deletedAt: null
        },
        {
            id: 'acc-2',
            name: 'Savings',
            institutionName: 'Marcus',
            type: AccountType.Savings,
            clearedBalance: 1000000,
            pendingBalance: 1000000,
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            deletedAt: null
        }
    ]);

    const mockSchedules = signal([
        {
            id: 'sch-1',
            payee: 'Electric Bill',
            amount: -12000,
            frequency: 'monthly',
            startDate: '2026-08-15',
            nextDueDate: '2026-09-15'
        }
    ]);

    beforeEach(async () => {
        const mockAuth = {
            currentUser: signal({
                displayName: 'Alex Mercer',
                email: 'alex@example.com'
            }),
            accessToken: signal(null),
            isGoogleDriveConnected: signal(false)
        };

        const mockStore = {
            transactions: mockTransactions,
            accounts: mockAccounts,
            schedules: mockSchedules,
            payees: signal([]),
            isInitialized: signal(true),
            syncStatus: signal('synced'),
            authError: signal(false),
            hasLocalFallback: signal(true),
            syncConflicts: signal([]),
            mergeCount: signal(0)
        };

        const mockSync = {
            isSyncing: signal(false),
            getSyncStatus: () => ({ lastSyncTime: Date.now() })
        };

        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                ThemeService,
                { provide: AuthService, useValue: mockAuth },
                { provide: LedgerStore, useValue: mockStore },
                { provide: SyncService, useValue: mockSync }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the dashboard component', () => {
        expect(component).toBeTruthy();
    });

    it('should display the Portfolio Overview header with personalized greeting', () => {
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Portfolio');
        expect(text).toContain('Overview');
        expect(text).toContain('Welcome back, Alex!');
    });

    it('should compute net position and cleared balance accurately', () => {
        // 500000 - 200000 = 300000 cents = $3,000.00
        expect(component.netPosition()).toBe(300000);
        expect(component.formattedNetPosition()).toBe('$3,000.00');
        expect(component.clearedBalance()).toBe(300000);
    });

    it('should list primary accounts and upcoming payments', () => {
        expect(component.primaryAccounts().length).toBe(2);
        expect(component.upcomingPayments().length).toBe(1);
        expect(component.upcomingPayments()[0]?.name).toBe('Electric Bill');
    });
});
