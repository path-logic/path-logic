import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType, type Cents, type IAccount, type ISODateString } from '@core';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { LlmService } from '../../../services/llm/llm.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../../services/sync/sync.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { AccountInfoComponent } from './account-info.component';
import {
    CheckingAccountDetailsPageView,
    LoanAccountDetailsPageView
} from './account-info.component.stories';

describe('AccountInfoComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AccountInfoComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Chase Checking',
            institutionName: 'JPMorgan Chase',
            type: AccountType.Checking,
            clearedBalance: 342050 as Cents,
            pendingBalance: 320000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        },
        {
            id: 'acc-loan',
            name: 'Auto Loan',
            institutionName: 'Honda Financial',
            type: AccountType.AutoLoan,
            clearedBalance: -1500000 as Cents,
            pendingBalance: -1500000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null,
            loanDetails: {
                originalAmount: 2500000 as Cents,
                interestRate: 0.045,
                termMonths: 60,
                monthlyPayment: 46600 as Cents,
                paymentDueDay: 15,
                startDate: '2024-01-01T00:00:00Z' as ISODateString,
                metadata: {
                    vehicleMake: 'Honda',
                    vehicleModel: 'Civic'
                }
            }
        }
    ];

    const mockLedgerStore = {
        accounts: signal(mockAccounts),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        payees: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal(0),
        updateAccount: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuth = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@example.com'
        }),
        accessToken: signal<string | null>(null),
        isLoggedIn: signal(true),
        isInitializing: signal(false),
        signOut: vi.fn()
    };

    const mockSync = {
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
            imports: [AccountInfoComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync },
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

        fixture = TestBed.createComponent(AccountInfoComponent);
    });

    it('executes CheckingAccountDetailsPageView story interaction test', async () => {
        fixture.componentRef.setInput(
            'accountId',
            (CheckingAccountDetailsPageView.args as any)?.accountId ?? 'acc-1'
        );
        fixture.detectChanges();

        await CheckingAccountDetailsPageView.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        expect(fixture.nativeElement.textContent).toContain('Chase Checking');
        expect(fixture.nativeElement.textContent).toContain('JPMorgan Chase');
        expect(fixture.nativeElement.textContent).toContain('Checking');
    });

    it('executes LoanAccountDetailsPageView story interaction test', async () => {
        fixture.componentRef.setInput(
            'accountId',
            (LoanAccountDetailsPageView.args as any)?.accountId ?? 'acc-loan'
        );
        fixture.detectChanges();

        await LoanAccountDetailsPageView.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Auto Loan');
        expect(fixture.nativeElement.textContent).toContain('Honda Financial');
        expect(fixture.nativeElement.textContent).toContain('Original Principal');
    });
});
