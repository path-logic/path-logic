import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { IAccount, IRecurringSchedule, ITransaction } from '@core';
import { AccountType, Frequency, PaymentMethod, ScheduleType, TransactionStatus } from '@core';
import Lara from '@primeuix/themes/lara';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AiAssistantService } from '../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../services/auth/auth.service';
import { CommandPaletteService } from '../../services/command-palette/command-palette.service';
import { GeminiService } from '../../services/gemini/gemini.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { LlmService } from '../../services/llm/llm.service';
import { SecurityManagerService } from '../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { RecurringDashboardComponent } from './recurring-dashboard.component';

const today = new Date();
const todayIso = today.toISOString().slice(0, 10);

const dueSoonDate = new Date(today);
dueSoonDate.setDate(today.getDate() + 2);
const dueSoonIso = dueSoonDate.toISOString().slice(0, 10);

const laterDate = new Date(today);
laterDate.setDate(today.getDate() + 10);
const laterIso = laterDate.toISOString().slice(0, 10);

const mockSchedules: Array<IRecurringSchedule> = [
    {
        id: 'sched-1',
        accountId: 'acc-1',
        payee: 'Electric Utility',
        amount: 15000,
        type: ScheduleType.Debit,
        frequency: Frequency.Monthly,
        startDate: todayIso as any,
        nextDueDate: dueSoonIso as any,
        autoPost: true,
        isActive: true,
        memo: 'Monthly electric bill',
        paymentMethod: PaymentMethod.ElectronicTransfer,
        endDate: null,
        lastOccurredDate: null,
        splits: []
    },
    {
        id: 'sched-2',
        accountId: 'acc-1',
        payee: 'Employer Salary',
        amount: 300000,
        type: ScheduleType.Deposit,
        frequency: Frequency.Biweekly,
        startDate: todayIso as any,
        nextDueDate: laterIso as any,
        autoPost: false,
        isActive: true,
        memo: 'Biweekly salary payout',
        paymentMethod: PaymentMethod.ElectronicTransfer,
        endDate: null,
        lastOccurredDate: null,
        splits: []
    }
];

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 500000,
        pendingBalance: 500000,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    }
];

const mockTransactions: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acc-1',
        payeeId: 'p-1',
        date: todayIso as any,
        payee: 'Electric Utility',
        memo: '',
        totalAmount: -15000,
        status: TransactionStatus.Cleared,
        checkNumber: null,
        importHash: 'hash-tx-1',
        splits: [],
        createdAt: '2026-08-20T00:00:00.000Z' as any,
        updatedAt: '2026-08-20T00:00:00.000Z' as any
    }
];

const createMockLedgerStore = () => ({
    schedules: signal<Array<IRecurringSchedule>>(mockSchedules),
    recurringSchedules: signal<Array<IRecurringSchedule>>(mockSchedules),
    accounts: signal<Array<IAccount>>(mockAccounts),
    transactions: signal<Array<ITransaction>>(mockTransactions),
    payees: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    isInitialized: signal<boolean>(true),
    isLoading: signal<boolean>(false),
    syncStatus: signal<string>('idle'),
    authError: signal<boolean>(false),
    hasLocalFallback: signal<boolean>(true),
    syncConflicts: signal<Array<any>>([]),
    mergeCount: signal<number>(0),
    addSchedule: fn(async () => {}),
    updateSchedule: fn(async () => {}),
    removeSchedule: fn(async () => {}),
    getOrCreatePayee: fn(async () => ({ id: 'p-1', name: 'Electric Utility' }))
});

const createMockAuthService = () => ({
    currentUser: signal({
        displayName: 'Alex Mercer',
        email: 'alex.mercer@pathlogic.io',
        photoURL: null
    }),
    accessToken: signal<string | null>('valid-token'),
    isLoggedIn: signal<boolean>(true),
    isInitializing: signal<boolean>(false),
    signOut: fn(async () => {}),
    signInWithGoogle: fn(async () => {})
});

const createMockSecurityManager = () => ({
    isIdle: signal<boolean>(false),
    startMonitoring: fn(),
    resetTimers: fn()
});

const createMockSyncService = () => ({
    isSyncing: signal<boolean>(false),
    getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
});

const createMockGeminiService = () => ({
    hasKey: () => true,
    apiKey: () => 'mock-gemini-key',
    generateContent: fn()
});

const createMockThemeService = () => ({
    resolvedTheme: signal<string>('light'),
    setTheme: fn(),
    toggleTheme: fn()
});

const createMockCommandPaletteService = () => ({
    open: fn(),
    close: fn(),
    isOpen: signal<boolean>(false)
});

const createMockLlmService = () => ({
    newerModelAlert: signal<any>(null),
    checkStartupNewerModel: fn(async () => {}),
    upgradeToNewestModel: fn(async () => {}),
    dismissModelUpgrade: fn(async () => {})
});

const createMockAiAssistantService = () => ({
    isOpen: signal<boolean>(false),
    messages: signal<Array<any>>([]),
    isSending: signal<boolean>(false),
    toggle: fn(),
    open: fn(),
    close: fn(),
    clearChat: fn(),
    sendMessage: fn(async () => {})
});

const createMockUserSettingsStore = () => ({
    settings: signal<Record<string, string>>({}),
    isLoading: signal<boolean>(false),
    primaryAccountId: signal<string | null>(null),
    getSetting: fn()
});

const meta: Meta<RecurringDashboardComponent> = {
    title: 'Pages/Recurring Dashboard',
    component: RecurringDashboardComponent,
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [
                    { id: 'color-contrast', enabled: false },
                    { id: 'scrollable-region-focusable', enabled: false }
                ]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                providePrimeNG({
                    theme: {
                        preset: Lara,
                        options: {
                            darkModeSelector: '.dark'
                        }
                    }
                }),
                { provide: LedgerStore, useValue: createMockLedgerStore() },
                { provide: AuthService, useValue: createMockAuthService() },
                { provide: SecurityManagerService, useValue: createMockSecurityManager() },
                { provide: SyncService, useValue: createMockSyncService() },
                { provide: GeminiService, useValue: createMockGeminiService() },
                { provide: ThemeService, useValue: createMockThemeService() },
                { provide: CommandPaletteService, useValue: createMockCommandPaletteService() },
                { provide: LlmService, useValue: createMockLlmService() },
                { provide: AiAssistantService, useValue: createMockAiAssistantService() },
                { provide: UserSettingsStore, useValue: createMockUserSettingsStore() },
                SidebarContextService
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<RecurringDashboardComponent>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Verify recurring list displays header and payee items
        await expect(
            canvas.getByRole('heading', { name: /Bills.*Scheduled/i, level: 1 })
        ).toBeInTheDocument();
        await expect(canvas.getByRole('cell', { name: /Electric Utility/i })).toBeInTheDocument();
        await expect(canvas.getByRole('cell', { name: /Employer Salary/i })).toBeInTheDocument();

        // 2. Verify 2-Week calendar view and navigation controls
        await expect(canvas.getByText('2-Week Rolling Horizon')).toBeInTheDocument();

        const nextTwoWeeksBtn = canvas.getByRole('button', { name: /Next 2 Weeks/i });
        await expect(nextTwoWeeksBtn).toBeInTheDocument();
        await userEvent.click(nextTwoWeeksBtn);

        const prevTwoWeeksBtn = canvas.getByRole('button', { name: /Prev 2 Weeks/i });
        await expect(prevTwoWeeksBtn).toBeInTheDocument();
        await userEvent.click(prevTwoWeeksBtn);

        const todayBtn = canvas.getByRole('button', { name: /^Today$/i });
        await expect(todayBtn).toBeInTheDocument();
        await userEvent.click(todayBtn);

        // 3. Verify upcoming due items filter ("Due This Week" / "Due Soon")
        const dueFilterBtns = canvas.getAllByRole('button', { name: /Due/i });
        await expect(dueFilterBtns.length).toBeGreaterThan(0);
        await userEvent.click(dueFilterBtns[0]!);

        // Electric Utility is due in 2 days (due soon) -> visible in table
        await expect(canvas.getByRole('cell', { name: /Electric Utility/i })).toBeInTheDocument();
        // Employer Salary is due in 10 days (not due soon) -> filtered out from table
        await expect(
            canvas.queryByRole('cell', { name: /Employer Salary/i })
        ).not.toBeInTheDocument();

        // Reset filter back to all schedules
        const allFilterBtns = canvas.getAllByRole('button', { name: /Active Schedules|All/i });
        await userEvent.click(allFilterBtns[0]!);
        await expect(canvas.getByRole('cell', { name: /Employer Salary/i })).toBeInTheDocument();
    }
};
