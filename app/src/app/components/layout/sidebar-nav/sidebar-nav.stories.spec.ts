import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SidebarNavComponent } from './sidebar-nav.component';
import { Collapsed, DarkMode, Default, LightMode } from './sidebar-nav.component.stories';

describe('SidebarNavComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<SidebarNavComponent>;

    const mockTransactions = signal(
        new Array<any>({
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-01',
            payee: 'Direct Deposit',
            totalAmount: 450000,
            status: 'cleared',
            splits: new Array<any>()
        })
    );

    const mockAccounts = signal(
        new Array<any>(
            {
                id: 'acc-1',
                name: 'Primary Checking',
                institutionName: 'Chase',
                type: 'checking',
                balance: 450000
            },
            {
                id: 'acc-2',
                name: 'High Yield Savings',
                institutionName: 'Marcus',
                type: 'savings',
                balance: 1250000
            }
        )
    );

    const mockSchedules = signal(
        new Array<any>(
            { id: 'rec-1', name: 'Rent Payment', amount: -210000 },
            { id: 'rec-2', name: 'Internet Utility', amount: -8000 }
        )
    );

    const mockLedgerStore = {
        transactions: mockTransactions,
        accounts: mockAccounts,
        schedules: mockSchedules,
        recurringSchedules: mockSchedules,
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        isInitialized: signal<boolean>(true),
        hasLocalFallback: signal<boolean>(true)
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@pathlogic.io',
            photoURL: null
        }),
        signOut: vi.fn()
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: () => ({ lastSyncTime: Date.now() })
    };

    beforeEach(async () => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.clear();
        }

        await TestBed.configureTestingModule({
            imports: [SidebarNavComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService }
            ]
        }).compileComponents();
    });

    afterEach(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.clear();
        }
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(SidebarNavComponent);
        fixture.nativeElement.style.display = 'block';
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Overview');
        expect(fixture.nativeElement.textContent).toContain('Alex Mercer');
    }, 15000);

    it('executes Collapsed story interaction test', async () => {
        fixture = TestBed.createComponent(SidebarNavComponent);
        fixture.nativeElement.style.display = 'block';
        fixture.detectChanges();

        await Collapsed.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.componentInstance.isCollapsed()).toBe(true);
    });

    it('executes DarkMode story interaction test', async () => {
        fixture = TestBed.createComponent(SidebarNavComponent);
        fixture.nativeElement.style.display = 'block';
        fixture.detectChanges();

        await DarkMode.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Overview');
    });

    it('executes LightMode story interaction test', async () => {
        fixture = TestBed.createComponent(SidebarNavComponent);
        fixture.nativeElement.style.display = 'block';
        fixture.detectChanges();

        await LightMode.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Overview');
    });
});
