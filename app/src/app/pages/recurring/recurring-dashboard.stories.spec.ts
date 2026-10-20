import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { IAccount, IRecurringSchedule, ITransaction } from '@core';
import { AccountType, Frequency, PaymentMethod, ScheduleType, TransactionStatus } from '@core';
import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { Default } from './recurring-dashboard.stories';

describe('RecurringDashboardComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<RecurringDashboardComponent>;

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(today.getDate() + 2);
    const dueSoonIso = dueSoonDate.toISOString().slice(0, 10);

    const laterDate = new Date(today);
    laterDate.setDate(today.getDate() + 10);
    const laterIso = laterDate.toISOString().slice(0, 10);

    const mockSchedules = signal<Array<IRecurringSchedule>>([
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
    ]);

    const mockAccounts = signal<Array<IAccount>>([
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
    ]);

    const mockTransactions = signal<Array<ITransaction>>([
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
    ]);

    const mockLedgerStore = {
        schedules: mockSchedules,
        recurringSchedules: mockSchedules,
        accounts: mockAccounts,
        transactions: mockTransactions,
        payees: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        isInitialized: signal<boolean>(true),
        isLoading: signal<boolean>(false),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal<number>(0),
        addSchedule: vi.fn().mockResolvedValue(undefined),
        updateSchedule: vi.fn().mockResolvedValue(undefined),
        removeSchedule: vi.fn().mockResolvedValue(undefined),
        getOrCreatePayee: vi.fn().mockResolvedValue({ id: 'p-1', name: 'Electric Utility' })
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex.mercer@pathlogic.io',
            photoURL: null
        }),
        accessToken: signal<string | null>('valid-token'),
        isLoggedIn: signal<boolean>(true),
        isInitializing: signal<boolean>(false),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockSecurityManager = {
        isIdle: signal<boolean>(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
    };

    const mockGeminiService = {
        hasKey: () => true,
        apiKey: () => 'mock-gemini-key',
        generateContent: vi.fn()
    };

    const mockThemeService = {
        resolvedTheme: signal<string>('light'),
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
    };

    const mockCommandPaletteService = {
        open: vi.fn(),
        close: vi.fn(),
        isOpen: signal<boolean>(false)
    };

    const mockLlmService = {
        newerModelAlert: signal<any>(null),
        checkStartupNewerModel: vi.fn().mockResolvedValue(undefined),
        upgradeToNewestModel: vi.fn().mockResolvedValue(undefined),
        dismissModelUpgrade: vi.fn().mockResolvedValue(undefined)
    };

    const mockAiAssistantService = {
        isOpen: signal<boolean>(false),
        messages: signal<Array<any>>([]),
        isSending: signal<boolean>(false),
        toggle: vi.fn(),
        open: vi.fn(),
        close: vi.fn(),
        clearChat: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue(undefined)
    };

    const mockUserSettingsStore = {
        settings: signal<Record<string, string>>({}),
        isLoading: signal<boolean>(false),
        primaryAccountId: signal<string | null>(null),
        getSetting: vi.fn()
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecurringDashboardComponent],
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
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: LlmService, useValue: mockLlmService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                SidebarContextService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RecurringDashboardComponent);
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Electric Utility');
        expect(fixture.nativeElement.textContent).toContain('2-Week Rolling Horizon');
    }, 15000);
});
