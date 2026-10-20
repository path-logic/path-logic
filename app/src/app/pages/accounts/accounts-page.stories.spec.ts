import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString
} from '../../core';
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
import { AccountsPageComponent } from './accounts-page.component';
import { Default, EmptyState } from './accounts-page.component.stories';

describe('AccountsPageComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AccountsPageComponent>;

    const mockAccounts = signal<Array<IAccount>>([
        {
            id: 'acc-1',
            name: 'Primary Checking',
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
            id: 'acc-2',
            name: 'High Yield Savings',
            institutionName: 'Marcus',
            type: AccountType.Savings,
            clearedBalance: 500000 as Cents,
            pendingBalance: 500000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        },
        {
            id: 'acc-3',
            name: 'Sapphire Preferred',
            institutionName: 'Chase',
            type: AccountType.Credit,
            clearedBalance: -45000 as Cents,
            pendingBalance: -45000 as Cents,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
            deletedAt: null
        }
    ]);

    const mockStore = {
        accounts: mockAccounts,
        trashedAccounts: signal<Array<IAccount>>([]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        payees: signal<Array<IPayee>>([]),
        categories: signal<Array<ICategory>>([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(null),
        hasLocalFallback: signal(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal(0),
        addAccount: vi.fn(),
        removeAccount: vi.fn(),
        restoreAccount: vi.fn(),
        purgeAccount: vi.fn(),
        emptyTrash: vi.fn()
    };

    const mockUserSettingsStore = {
        settings: signal({}),
        primaryAccountId: signal<string | null>('acc-1'),
        setPrimaryAccountId: vi.fn().mockResolvedValue(undefined),
        getSetting: vi.fn(),
        setSetting: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuth = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@pathlogic.io'
        }),
        accessToken: signal('mock-token'),
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
        mockAccounts.set([
            {
                id: 'acc-1',
                name: 'Primary Checking',
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
                id: 'acc-2',
                name: 'High Yield Savings',
                institutionName: 'Marcus',
                type: AccountType.Savings,
                clearedBalance: 500000 as Cents,
                pendingBalance: 500000 as Cents,
                isActive: true,
                createdAt: '2026-01-01T00:00:00Z' as ISODateString,
                updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
                deletedAt: null
            },
            {
                id: 'acc-3',
                name: 'Sapphire Preferred',
                institutionName: 'Chase',
                type: AccountType.Credit,
                clearedBalance: -45000 as Cents,
                pendingBalance: -45000 as Cents,
                isActive: true,
                createdAt: '2026-01-01T00:00:00Z' as ISODateString,
                updatedAt: '2026-01-01T00:00:00Z' as ISODateString,
                deletedAt: null
            }
        ]);
        mockStore.isInitialized.set(true);
        mockStore.isLoading.set(false);

        await TestBed.configureTestingModule({
            imports: [AccountsPageComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockStore },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: LlmService, useValue: mockLlmService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountsPageComponent);
    });

    it('executes Default story interaction test', async () => {
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Accounts');
        expect(fixture.nativeElement.textContent).toContain('Primary Checking');
        expect(fixture.nativeElement.textContent).toContain('Add Account');
    }, 15000);

    it('executes EmptyState story interaction test', async () => {
        mockAccounts.set([]);
        fixture.detectChanges();

        await EmptyState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Welcome to Path Logic');
    });
});
