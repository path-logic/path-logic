import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
    AccountType,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString
} from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

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

const mockDefaultAccounts: Array<IAccount> = [
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
];

const mockStore = {
    accounts: signal(mockDefaultAccounts),
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
    addAccount: async () => {},
    removeAccount: async () => {},
    restoreAccount: async () => {},
    purgeAccount: async () => {},
    emptyTrash: async () => {}
};

const mockUserSettingsStore = {
    settings: signal({}),
    primaryAccountId: signal<string | null>('acc-1'),
    setPrimaryAccountId: async () => {},
    getSetting: () => undefined,
    setSetting: async () => {}
};

const mockAuth = {
    currentUser: signal({
        displayName: 'Alex Mercer',
        email: 'alex@pathlogic.io'
    }),
    accessToken: signal('mock-token'),
    isLoggedIn: signal(true),
    isInitializing: signal(false),
    signOut: async () => {}
};

const mockSync = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const mockSecurityManager = {
    isIdle: signal(false),
    startMonitoring: () => {},
    resetTimers: () => {}
};

const mockSidebarContextService = {
    customTemplate: signal<any>(null),
    isNavSectionCollapsed: signal(false),
    navPosition: signal<'top' | 'bottom'>('top'),
    hasContext: signal(false),
    setContext: () => {},
    clearContext: () => {},
    setNavPosition: () => {},
    toggleNavSection: () => {},
    toggleNavPosition: () => {}
};

const mockPostHogService = {
    posthog: {
        capture: () => {},
        identify: () => {},
        reset: () => {}
    },
    capture: () => {}
};

const mockThemeService = {
    resolvedTheme: signal('light'),
    setTheme: () => {},
    toggleTheme: () => {}
};

const mockCommandPaletteService = {
    open: () => {},
    close: () => {},
    isOpen: signal(false)
};

const mockAiAssistantService = {
    isOpen: signal(false),
    messages: signal<Array<any>>([]),
    isSending: signal(false),
    toggle: () => {},
    open: () => {},
    close: () => {},
    clearChat: () => {},
    sendMessage: async () => {}
};

const mockGeminiService = {
    hasKey: () => true,
    apiKey: () => 'mock-api-key'
};

const mockLlmService = {
    newerModelAlert: signal<any>(null),
    checkStartupNewerModel: async () => {},
    upgradeToNewestModel: async () => {},
    dismissModelUpgrade: async () => {}
};

const meta: Meta<AccountsPageComponent> = {
    title: 'Pages/AccountsPageComponent',
    component: AccountsPageComponent,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    decorators: [
        applicationConfig({
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
        })
    ]
};

export default meta;
type Story = StoryObj<AccountsPageComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify Accounts header
        await expect(canvas.getByRole('heading', { name: /^Accounts$/i })).toBeInTheDocument();

        // Verify New Account button
        await expect(canvas.getByRole('button', { name: /Add Account/i })).toBeInTheDocument();

        // Verify account cards rendered
        await expect(canvas.getByText('Primary Checking')).toBeInTheDocument();
        await expect(canvas.getByText('High Yield Savings')).toBeInTheDocument();
        await expect(canvas.getByText('Sapphire Preferred')).toBeInTheDocument();
    }
};

export const EmptyState: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        ...mockStore,
                        accounts: signal<Array<IAccount>>([]),
                        isInitialized: signal(true),
                        isLoading: signal(false)
                    }
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify onboarding wizard shown when no accounts exist
        await expect(canvas.getByText(/Welcome to Path Logic/i)).toBeInTheDocument();
        await expect(
            canvas.getByText(/Let's get started by creating your first account/i)
        ).toBeInTheDocument();
    }
};
