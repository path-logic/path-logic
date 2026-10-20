import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString,
    type ITransaction
} from '@core';
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
import { SplitTransactionPageComponent } from './split-transaction-page.component';
import { DarkMode, DefaultPaycheck } from './split-transaction-page.component.stories';

describe('SplitTransactionPageComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<SplitTransactionPageComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Checking Account',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 500000 as Cents,
            pendingBalance: 500000 as Cents,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-income',
            parentId: null,
            name: 'Salary & Wages',
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'cat-tax',
            parentId: null,
            name: 'Taxes',
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockTransaction: ITransaction = {
        id: 'tx-paycheck',
        accountId: 'acc-1',
        date: '2026-08-15' as ISODateString,
        payee: 'Acme Corp Payroll',
        payeeId: 'p-acme',
        memo: 'Bi-weekly Paycheck',
        totalAmount: 200000 as Cents,
        status: TransactionStatus.Cleared,
        splits: [
            { id: 's-1', amount: 250000 as Cents, categoryId: 'cat-income', memo: 'Gross Pay' },
            {
                id: 's-2',
                amount: -50000 as Cents,
                categoryId: 'cat-tax',
                memo: 'Federal & State Tax'
            }
        ],
        checkNumber: null,
        importHash: 'h-paycheck',
        createdAt: '2026-08-15T00:00:00Z' as ISODateString,
        updatedAt: '2026-08-15T00:00:00Z' as ISODateString
    };

    const mockLedgerStore = {
        isInitialized: signal(true),
        isLoading: signal(false),
        authError: signal(null),
        hasLocalFallback: signal(true),
        syncStatus: signal('idle'),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal(0),
        accounts: signal(mockAccounts),
        categories: signal(mockCategories),
        transactions: signal<Array<ITransaction>>([mockTransaction]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        payees: signal<Array<IPayee>>([]),
        updateTransaction: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuthService = {
        accessToken: signal<string | null>(null),
        currentUser: signal(null),
        isLoggedIn: signal(true),
        isInitializing: signal(false),
        signOut: vi.fn(),
        signInWithGoogle: vi.fn()
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
            imports: [SplitTransactionPageComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: (k: string) => {
                                    if (k === 'accountId') return 'acc-1';
                                    if (k === 'transactionId') return 'tx-paycheck';
                                    return null;
                                }
                            }
                        }
                    }
                },
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

        fixture = TestBed.createComponent(SplitTransactionPageComponent);
    });

    it('executes DefaultPaycheck story interaction test', async () => {
        fixture.detectChanges();

        await DefaultPaycheck.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Split');
        expect(fixture.nativeElement.textContent).toContain('Perfectly Balanced');
    });

    it('renders DarkMode story', () => {
        fixture.detectChanges();
        expect(DarkMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Split');
    });
});
