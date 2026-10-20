import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type ISODateString,
    type ITransaction
} from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

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
        id: 'acc-2',
        name: 'Emergency Savings',
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
    deleteTransaction: async () => {},
    updateTransaction: async () => {},
    applyReconciliationBatch: async () => {},
    addAccount: async () => {}
};

const mockAuthService = {
    currentUser: signal({
        displayName: 'Alex Mercer',
        email: 'alex@pathlogic.io'
    }),
    accessToken: signal('mock-token'),
    isLoggedIn: signal(true),
    isInitializing: signal(false),
    signOut: async () => {}
};

const mockSyncService = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() }),
    sync: async () => {},
    startAutoSync: () => {},
    stopAutoSync: () => {}
};

const mockSecurityManager = {
    isIdle: signal(false),
    startMonitoring: () => {},
    resetTimers: () => {}
};

const mockUserSettingsStore = {
    primaryAccountId: signal<string | null>('acc-1'),
    settings: signal({}),
    setPrimaryAccountId: async () => {},
    getSetting: () => undefined,
    setSetting: async () => {}
};

const mockSidebarContextService = {
    customTemplate: mockCustomTemplate,
    isNavSectionCollapsed: signal(false),
    navPosition: signal<'top' | 'bottom'>('top'),
    hasContext: computed(() => mockCustomTemplate() !== null),
    setContext: (tpl: any) => mockCustomTemplate.set(tpl),
    clearContext: () => mockCustomTemplate.set(null),
    setNavPosition: () => {},
    toggleNavSection: () => {},
    toggleNavPosition: () => {}
};

const mockImportService = {
    progress: signal({ stage: 'idle', percent: 0, message: '' }),
    matches: signal<Array<any>>([]),
    stats: signal(null),
    unknownCategories: signal<Array<string>>([]),
    handleFile: () => {},
    cancel: () => {},
    reset: () => {}
};

const mockAiService = {
    status: signal('idle'),
    progress: signal({ pct: 0, processed: 0, total: 0, message: '' }),
    suggestions: signal<Array<any>>([]),
    error: signal(null),
    targetTransactions: signal<Array<any>>([]),
    startBackgroundCategorization: () => {},
    acceptAll: async () => 0,
    cancel: () => {},
    dismiss: () => {}
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

const meta: Meta<AccountDetailComponent> = {
    title: 'Pages/AccountDetailComponent',
    component: AccountDetailComponent,
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
        })
    ]
};

export default meta;
type Story = StoryObj<AccountDetailComponent>;

export const Default: Story = {
    args: {
        accountId: 'acc-1'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify account details in header/dropdown
        await expect(canvas.getAllByText(/Main Checking/i)[0]).toBeInTheDocument();

        // Verify transaction list presence
        await expect(canvas.getAllByText(/Whole Foods Market/i)[0]).toBeInTheDocument();
        await expect(canvas.getAllByText(/Coffee Shop/i)[0]).toBeInTheDocument();
    }
};

export const WithTransactions: Story = {
    args: {
        accountId: 'acc-1'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify account name
        await expect(canvas.getAllByText(/Main Checking/i)[0]).toBeInTheDocument();

        // Verify transactions list
        await expect(canvas.getAllByText(/Whole Foods Market/i)[0]).toBeInTheDocument();
        await expect(canvas.getAllByText(/Coffee Shop/i)[0]).toBeInTheDocument();
        await expect(canvas.getAllByText(/Tech Direct Deposit/i)[0]).toBeInTheDocument();
    }
};

export const EmptyAccount: Story = {
    args: {
        accountId: 'acc-empty'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify empty account name
        await expect(canvas.getAllByText(/Empty Savings/i)[0]).toBeInTheDocument();

        // Verify empty state display in ledger table
        await expect(canvas.getAllByText(/Ledger is empty/i)[0]).toBeInTheDocument();
    }
};
