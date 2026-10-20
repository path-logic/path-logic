import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ISODateString
} from '@core';
import { AiAssistantService } from '../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../services/auth/auth.service';
import { CommandPaletteService } from '../../services/command-palette/command-palette.service';
import { GeminiService } from '../../services/gemini/gemini.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { LlmService } from '../../services/llm/llm.service';
import { PostHogService } from '../../services/posthog/posthog.service';
import { SecurityManagerService } from '../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { DashboardComponent } from './dashboard.component';
import { DarkMode, Default, HeroAccountLayout, LightMode } from './dashboard.component.stories';

describe('DashboardComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<DashboardComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Checking Account',
            institutionName: 'Chase',
            type: AccountType.Checking,
            clearedBalance: 1487050 as Cents,
            pendingBalance: 1487050 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        },
        {
            id: 'acc-2',
            name: 'Emergency Savings',
            institutionName: 'Marcus',
            type: AccountType.Savings,
            clearedBalance: 4532110 as Cents,
            pendingBalance: 4532110 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        },
        {
            id: 'acc-3',
            name: 'Gold Card',
            institutionName: 'Amex',
            type: AccountType.Credit,
            clearedBalance: 125060 as Cents,
            pendingBalance: 125060 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        }
    ];

    const mockTransactions: Array<any> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-10',
            payee: 'Uber Trip',
            totalAmount: -2240,
            status: TransactionStatus.Cleared,
            splits: []
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-01',
            payee: 'Employer Tech Direct Deposit',
            totalAmount: 480000,
            status: TransactionStatus.Cleared,
            splits: []
        }
    ];

    const mockSchedules: Array<any> = [
        {
            id: 'sch-1',
            payee: 'Apartment Lease',
            amount: -210000,
            frequency: 'monthly',
            startDate: '2026-08-01',
            nextDueDate: '2026-09-01'
        },
        {
            id: 'sch-2',
            payee: 'Fiber Internet',
            amount: -7000,
            frequency: 'monthly',
            startDate: '2026-08-15',
            nextDueDate: '2026-09-15'
        }
    ];

    const mockLedgerStore = {
        transactions: signal(mockTransactions),
        accounts: signal(mockAccounts),
        schedules: signal(mockSchedules),
        recurringSchedules: signal(mockSchedules),
        payees: signal<Array<any>>([
            { id: 'p-1', name: 'Uber' },
            { id: 'p-2', name: 'Apartment Lease' }
        ]),
        categories: signal<Array<any>>([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal(0),
        addTransaction: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@pathlogic.io'
        }),
        accessToken: signal('mock-token'),
        isLoggedIn: signal(true),
        isInitializing: signal(false),
        signOut: vi.fn()
    };

    const mockSyncService = {
        isSyncing: signal(false),
        getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: Date.now() })
    };

    const mockSecurityManager = {
        isIdle: signal(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockUserSettingsStore = {
        settings: signal({}),
        primaryAccountId: signal<string | null>('acc-1'),
        setPrimaryAccountId: vi.fn().mockResolvedValue(undefined),
        getSetting: vi.fn(),
        setSetting: vi.fn().mockResolvedValue(undefined)
    };

    const mockSidebarContextService = {
        customTemplate: signal<any>(null),
        isNavSectionCollapsed: signal(false),
        navPosition: signal<'top' | 'bottom'>('top'),
        hasContext: signal(false),
        setContext: vi.fn(),
        clearContext: vi.fn(),
        setNavPosition: vi.fn(),
        toggleNavSection: vi.fn(),
        toggleNavPosition: vi.fn()
    };

    const mockPostHogService = {
        posthog: {
            capture: vi.fn(),
            identify: vi.fn(),
            reset: vi.fn()
        },
        capture: vi.fn()
    };

    const mockThemeService = {
        resolvedTheme: signal('light'),
        preference: signal('light'),
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
    };

    const mockCommandPaletteService = {
        open: vi.fn(),
        close: vi.fn(),
        isOpen: signal(false)
    };

    const mockAiAssistantService = {
        isOpen: signal(false),
        messages: signal<Array<any>>([]),
        isSending: signal(false),
        toggle: vi.fn(),
        open: vi.fn(),
        close: vi.fn(),
        clearChat: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue(undefined)
    };

    const mockGeminiService = {
        hasKey: vi.fn().mockReturnValue(true),
        apiKey: vi.fn().mockReturnValue('mock-api-key')
    };

    const mockLlmService = {
        newerModelAlert: signal<any>(null),
        checkStartupNewerModel: vi.fn().mockResolvedValue(undefined),
        upgradeToNewestModel: vi.fn().mockResolvedValue(undefined),
        dismissModelUpgrade: vi.fn().mockResolvedValue(undefined)
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: LlmService, useValue: mockLlmService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
    });

    it('executes Default story interaction test', async () => {
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Portfolio Overview');
        expect(fixture.nativeElement.textContent).toContain('Account Portfolio');
        expect(fixture.nativeElement.textContent).toContain('Recent Activity');
    });

    it('executes HeroAccountLayout story interaction test', async () => {
        fixture.detectChanges();

        await HeroAccountLayout.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Checking Account');
        expect(fixture.nativeElement.textContent).toContain('Recent Activity');
    });

    it('renders DarkMode story', () => {
        fixture.detectChanges();
        expect(DarkMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Portfolio Overview');
    });

    it('renders LightMode story', () => {
        fixture.detectChanges();
        expect(LightMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Portfolio Overview');
    });
});
