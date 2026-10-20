import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type ISODateString,
    type ITransaction
} from '../../core';
import { AiAssistantService } from '../../services/ai-assistant/ai-assistant.service';
import { AiAutoCategorizeService } from '../../services/ai-auto-categorize/ai-auto-categorize.service';
import { AuthService } from '../../services/auth/auth.service';
import { CommandPaletteService } from '../../services/command-palette/command-palette.service';
import { GeminiService } from '../../services/gemini/gemini.service';
import { ImportOrchestrationService } from '../../services/import/import-orchestration.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { LlmService } from '../../services/llm/llm.service';
import { PostHogService } from '../../services/posthog/posthog.service';
import { SecurityManagerService } from '../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { AccountDetailComponent } from './account-detail.component';
import { Default, EmptyAccount, WithTransactions } from './account-detail.component.stories';

describe('AccountDetailComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AccountDetailComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Main Checking',
            institutionName: 'Chase',
            type: AccountType.Checking,
            clearedBalance: 150000 as Cents,
            pendingBalance: 150000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        },
        {
            id: 'acc-empty',
            name: 'Empty Savings',
            institutionName: 'Ally',
            type: AccountType.Savings,
            clearedBalance: 0 as Cents,
            pendingBalance: 0 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        }
    ];

    const mockTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-15' as ISODateString,
            payee: 'Whole Foods Market',
            payeeId: 'p-1',
            memo: 'Weekly groceries',
            totalAmount: -4250 as Cents,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-1', amount: -4250 as Cents, categoryId: 'cat-1', memo: '' }],
            checkNumber: null,
            importHash: 'h-1',
            createdAt: '2026-08-15T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-15T00:00:00Z' as ISODateString
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-16' as ISODateString,
            payee: 'Coffee Shop',
            payeeId: 'p-2',
            memo: 'Morning roast',
            totalAmount: -550 as Cents,
            status: TransactionStatus.Pending,
            splits: [{ id: 's-2', amount: -550 as Cents, categoryId: 'cat-2', memo: '' }],
            checkNumber: null,
            importHash: 'h-2',
            createdAt: '2026-08-16T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-16T00:00:00Z' as ISODateString
        },
        {
            id: 'tx-3',
            accountId: 'acc-1',
            date: '2026-08-20' as ISODateString,
            payee: 'Tech Direct Deposit',
            payeeId: 'p-3',
            memo: 'Payroll',
            totalAmount: 350000 as Cents,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-3', amount: 350000 as Cents, categoryId: 'cat-3', memo: '' }],
            checkNumber: null,
            importHash: 'h-3',
            createdAt: '2026-08-20T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-20T00:00:00Z' as ISODateString
        }
    ];

    const mockCustomTemplate = signal<any>(null);

    const mockLedgerStore = {
        isInitialized: signal(true),
        isLoading: signal(false),
        accounts: signal(mockAccounts),
        transactions: signal(mockTransactions),
        payees: signal<Array<any>>([
            { id: 'p-1', name: 'Whole Foods Market' },
            { id: 'p-2', name: 'Coffee Shop' },
            { id: 'p-3', name: 'Tech Direct Deposit' }
        ]),
        categories: signal<Array<ICategory>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        syncStatus: signal('synced'),
        authError: signal(null),
        hasLocalFallback: signal(true),
        deleteTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        applyReconciliationBatch: vi.fn(),
        addAccount: vi.fn()
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
        getSyncStatus: vi.fn().mockReturnValue({ lastSyncTime: Date.now() }),
        sync: vi.fn(),
        startAutoSync: vi.fn(),
        stopAutoSync: vi.fn()
    };

    const mockSecurityManager = {
        isIdle: signal(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockUserSettingsStore = {
        primaryAccountId: signal<string | null>('acc-1'),
        settings: signal({}),
        setPrimaryAccountId: vi.fn().mockResolvedValue(undefined),
        getSetting: vi.fn(),
        setSetting: vi.fn().mockResolvedValue(undefined)
    };

    const mockSidebarContextService = {
        customTemplate: mockCustomTemplate,
        isNavSectionCollapsed: signal(false),
        navPosition: signal<'top' | 'bottom'>('top'),
        hasContext: computed(() => mockCustomTemplate() !== null),
        setContext: vi.fn((tpl: any) => mockCustomTemplate.set(tpl)),
        clearContext: vi.fn(() => mockCustomTemplate.set(null)),
        setNavPosition: vi.fn(),
        toggleNavSection: vi.fn(),
        toggleNavPosition: vi.fn()
    };

    const mockImportService = {
        progress: signal({ stage: 'idle', percent: 0, message: '' }),
        matches: signal<Array<any>>([]),
        stats: signal(null),
        unknownCategories: signal<Array<string>>([]),
        handleFile: vi.fn(),
        cancel: vi.fn(),
        reset: vi.fn()
    };

    const mockAiService = {
        status: signal('idle'),
        progress: signal({ pct: 0, processed: 0, total: 0, message: '' }),
        suggestions: signal<Array<any>>([]),
        error: signal(null),
        targetTransactions: signal<Array<any>>([]),
        startBackgroundCategorization: vi.fn(),
        acceptAll: vi.fn().mockResolvedValue(0),
        cancel: vi.fn(),
        dismiss: vi.fn()
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
            imports: [AccountDetailComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: LlmService, useValue: mockLlmService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountDetailComponent);
    });

    it('executes Default story interaction test', async () => {
        fixture.componentRef.setInput('accountId', (Default.args as any)?.accountId ?? 'acc-1');
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Main Checking');
        expect(fixture.nativeElement.textContent).toContain('Whole Foods Market');
    });

    it('executes WithTransactions story interaction test', async () => {
        fixture.componentRef.setInput(
            'accountId',
            (WithTransactions.args as any)?.accountId ?? 'acc-1'
        );
        fixture.detectChanges();

        await WithTransactions.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Tech Direct Deposit');
    });

    it('executes EmptyAccount story interaction test', async () => {
        fixture.componentRef.setInput(
            'accountId',
            (EmptyAccount.args as any)?.accountId ?? 'acc-empty'
        );
        fixture.detectChanges();

        await EmptyAccount.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Empty Savings');
        expect(fixture.nativeElement.textContent).toContain('Ledger is empty');
    });
});
