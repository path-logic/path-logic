import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TransactionStatus } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { SidebarNavComponent } from './sidebar-nav.component';

describe('SidebarNavComponent', () => {
    let fixture: ComponentFixture<SidebarNavComponent>;
    let component: SidebarNavComponent;
    let themeService: ThemeService;
    let aiAssistantService: AiAssistantService;
    let authService: AuthService;

    const mockTransactions = signal([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-01',
            payee: 'Employer',
            totalAmount: 300000,
            status: TransactionStatus.Cleared,
            splits: []
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-05',
            payee: 'Landlord',
            totalAmount: -120000,
            status: TransactionStatus.Pending,
            splits: []
        }
    ]);

    const mockAccounts = signal([
        {
            id: 'acc-1',
            name: 'Checking',
            institutionName: 'Chase',
            type: 'checking',
            balance: 180000
        }
    ]);

    const mockSchedules = signal([{ id: 'rec-1', name: 'Rent', amount: -120000 }]);

    beforeEach(async () => {
        const mockAuth = {
            currentUser: signal({
                displayName: 'Jane Doe',
                email: 'jane@example.com',
                photoURL: null
            }),
            signOut: vi.fn()
        };

        const mockLedger = {
            transactions: mockTransactions,
            accounts: mockAccounts,
            schedules: mockSchedules,
            isInitialized: signal(true),
            syncStatus: signal('synced'),
            authError: signal(false),
            hasLocalFallback: signal(true)
        };

        const mockSync = {
            isSyncing: signal(false),
            getSyncStatus: () => ({ lastSyncTime: Date.now() })
        };

        await TestBed.configureTestingModule({
            imports: [SidebarNavComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuth },
                { provide: LedgerStore, useValue: mockLedger },
                { provide: SyncService, useValue: mockSync }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SidebarNavComponent);
        component = fixture.componentInstance;
        themeService = TestBed.inject(ThemeService);
        aiAssistantService = TestBed.inject(AiAssistantService);
        authService = TestBed.inject(AuthService);
        fixture.detectChanges();
    });

    it('should create the sidebar nav component', () => {
        expect(component).toBeTruthy();
    });

    it('should render all primary navigation links', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Overview');
        expect(compiled.textContent).toContain('Accounts');
        expect(compiled.textContent).toContain('Recurring');
        expect(compiled.textContent).toContain('Payees');
        expect(compiled.textContent).toContain('Settings');
    });

    it('should display the computed net position correctly', () => {
        // 300000 + (-120000) = 180000 cents = $1,800.00
        expect(component.formattedNetBalance()).toBe('$1,800.00');
    });

    it('should toggle theme when theme button is clicked', () => {
        const spy = vi.spyOn(themeService, 'setTheme');
        component.toggleTheme();
        expect(spy).toHaveBeenCalled();
    });

    it('should toggle AI assistant when AI button is clicked', () => {
        const spy = vi.spyOn(aiAssistantService, 'toggle');
        component.toggleAiAssistant();
        expect(spy).toHaveBeenCalled();
    });

    it('should toggle user menu on click and sign out when requested', () => {
        expect(component.showUserMenu()).toBe(false);
        component.toggleUserMenu();
        expect(component.showUserMenu()).toBe(true);

        component.signOut();
        expect(component.showUserMenu()).toBe(false);
        expect(authService.signOut).toHaveBeenCalled();
    });

    it('should close user menu on escape key', () => {
        component.showUserMenu.set(true);
        component.onEscape();
        expect(component.showUserMenu()).toBe(false);
    });
});
