import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AccountType } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { AccountInfoComponent } from './account-info.component';

describe('AccountInfoComponent', () => {
    let fixture: ComponentFixture<AccountInfoComponent>;
    let component: AccountInfoComponent;
    let router: Router;

    const mockAccounts = signal([
        {
            id: 'acc-1',
            name: 'Chase Checking',
            institutionName: 'JPMorgan Chase',
            type: AccountType.Checking,
            clearedBalance: 342050,
            pendingBalance: 320000,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            deletedAt: null
        }
    ]);

    const mockUpdateAccount = vi.fn().mockResolvedValue(undefined);

    const mockLedgerStore = {
        accounts: mockAccounts,
        transactions: signal([]),
        schedules: signal([]),
        payees: signal([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal([]),
        mergeCount: signal(0),
        updateAccount: mockUpdateAccount
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
            imports: [AccountInfoComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(AccountInfoComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.detectChanges();
    });

    it('should create the AccountInfoComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should format currency correctly', () => {
        expect(component.formatCurrency(342050)).toBe('$3,420.50');
        expect(component.formatCurrency(-5000)).toBe('-$50.00');
    });

    it('should display the account details page header and balance badges', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Account Details');
        expect(el.textContent).toContain('JPMorgan Chase');
        expect(el.textContent).toContain('Cleared Balance');
        expect(el.textContent).toContain('$3,420.50');
    });

    it('should navigate back to the account ledger when handleCancel is called', () => {
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        component.handleCancel();
        expect(navigateSpy).toHaveBeenCalledWith(['/accounts', 'acc-1']);
    });

    it('should update account and navigate when handleSubmit is called', async () => {
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const updated = {
            ...mockAccounts()[0]!,
            name: 'Updated Checking'
        };

        await component.handleSubmit(updated);
        expect(mockUpdateAccount).toHaveBeenCalledWith(updated);
        expect(navigateSpy).toHaveBeenCalledWith(['/accounts', 'acc-1']);
    });
});
