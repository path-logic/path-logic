import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type IRecurringSchedule,
    type ISODateString
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
import { RecurringScheduleFormComponent } from './recurring-schedule-form.component';
import {
    DarkMode,
    LightMode,
    MobileViewport,
    NewSchedule,
    TabletViewport
} from './recurring-schedule-form.component.stories';

describe('RecurringScheduleFormComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<RecurringScheduleFormComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 100000 as Cents,
            pendingBalance: 100000 as Cents,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
        }
    ];

    const mockPayees: Array<IPayee> = [
        {
            id: 'payee-1',
            name: 'Comcast Internet',
            defaultCategoryId: null,
            notes: null,
            address: null,
            city: null,
            state: null,
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
        }
    ];

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-utilities',
            name: 'Utilities',
            parentId: null,
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString
        }
    ];

    const mockSchedules: Array<IRecurringSchedule> = [
        {
            id: 'sched-1',
            accountId: 'acc-1',
            payee: 'Comcast Internet',
            amount: 8500 as Cents,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            startDate: '2026-01-01T00:00:00.000Z' as ISODateString,
            endDate: null,
            nextDueDate: '2026-09-01T00:00:00.000Z' as ISODateString,
            lastOccurredDate: null,
            splits: [],
            memo: 'High speed internet',
            autoPost: true,
            isActive: true
        }
    ];

    const mockLedgerStore = {
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('idle'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        mergeCount: signal(0),
        syncConflicts: signal<Array<any>>([]),
        totalClearedBalance: signal(0),
        totalPendingBalance: signal(0),
        transactions: signal<Array<any>>([]),
        accounts: signal<Array<IAccount>>(mockAccounts),
        payees: signal<Array<IPayee>>(mockPayees),
        categories: signal<Array<ICategory>>(mockCategories),
        schedules: signal<Array<IRecurringSchedule>>(mockSchedules),
        recurringSchedules: signal<Array<IRecurringSchedule>>(mockSchedules),
        addSchedule: vi.fn().mockResolvedValue(undefined),
        updateSchedule: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuthService = {
        accessToken: signal<string | null>(null),
        currentUser: signal(null),
        isLoggedIn: signal(true),
        isInitializing: signal(false),
        signInWithGoogle: vi.fn(),
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
        primaryAccountId: signal<string | null>(null),
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
            imports: [RecurringScheduleFormComponent],
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

        fixture = TestBed.createComponent(RecurringScheduleFormComponent);
    });

    it('executes NewSchedule story interaction test', async () => {
        fixture.detectChanges();

        await NewSchedule.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('New Recurring Schedule');
        expect(fixture.nativeElement.textContent).toContain('Debit / Bill');
    }, 15000);

    it('renders MobileViewport story', () => {
        fixture.detectChanges();
        expect(MobileViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Recurring Schedule');
    });

    it('renders TabletViewport story', () => {
        fixture.detectChanges();
        expect(TabletViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Recurring Schedule');
    });

    it('renders DarkMode story', () => {
        fixture.detectChanges();
        expect(DarkMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Recurring Schedule');
    });

    it('renders LightMode story', () => {
        fixture.detectChanges();
        expect(LightMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Recurring Schedule');
    });
});
