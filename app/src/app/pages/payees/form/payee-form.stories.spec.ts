import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IPayee } from '@core';
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
import { PayeeFormComponent } from './payee-form.component';
import {
    DarkMode,
    EditPayee,
    LightMode,
    MobileViewport,
    NewPayee,
    TabletViewport
} from './payee-form.component.stories';

describe('PayeeFormComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<PayeeFormComponent>;

    const mockPayees: Array<IPayee> = [
        {
            id: 'payee-1',
            name: 'Whole Foods Market',
            defaultCategoryId: 'cat-groceries',
            notes: 'Organic grocery purchases',
            address: null,
            city: null,
            state: null,
            zipCode: null,
            latitude: null,
            longitude: null,
            website: null,
            phone: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
        }
    ];

    const mockCategories: Array<any> = [
        { id: 'cat-groceries', name: 'Groceries' },
        { id: 'cat-utilities', name: 'Utilities' },
        { id: 'cat-housing', name: 'Housing & Rent' }
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
        accounts: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        payees: signal<Array<IPayee>>(mockPayees),
        categories: signal<Array<any>>(mockCategories),
        updatePayee: vi.fn().mockResolvedValue(undefined),
        getOrCreatePayee: vi
            .fn()
            .mockImplementation(async (name: string) => ({ id: 'new-id', name }))
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
            imports: [PayeeFormComponent],
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

        fixture = TestBed.createComponent(PayeeFormComponent);
    });

    it('executes NewPayee story interaction test', async () => {
        fixture.detectChanges();

        await NewPayee.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('New Payee');
    });

    it('executes EditPayee story interaction test', async () => {
        fixture.componentRef.setInput(
            'initialPayee',
            (EditPayee.args as any)?.initialPayee ?? mockPayees[0]
        );
        fixture.detectChanges();

        await EditPayee.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Edit Payee');
        const nameInput = fixture.nativeElement.querySelector(
            '#payee-name-input'
        ) as HTMLInputElement;
        expect(nameInput?.value).toBe('Whole Foods Market');
    });

    it('renders MobileViewport story', () => {
        fixture.detectChanges();
        expect(MobileViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Payee');
    });

    it('renders TabletViewport story', () => {
        fixture.detectChanges();
        expect(TabletViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Payee');
    });

    it('renders DarkMode story', () => {
        fixture.detectChanges();
        expect(DarkMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Payee');
    });

    it('renders LightMode story', () => {
        fixture.detectChanges();
        expect(LightMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Payee');
    });
});
