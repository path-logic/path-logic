import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAccount } from '@core';
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
import { AccountFormComponent } from './account-form.component';
import {
    DarkMode,
    LightMode,
    MobileViewport,
    Step1SelectType,
    Step2EnterDetails,
    TabletViewport
} from './account-form.component.stories';

describe('AccountFormComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AccountFormComponent>;

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
        accounts: signal<Array<IAccount>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        payees: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        addAccount: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuth = {
        accessToken: signal<string | null>(null),
        currentUser: signal(null),
        isLoggedIn: signal(true),
        isInitializing: signal(false),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
    };

    const mockPostHogService = {
        posthog: {
            capture: vi.fn(),
            identify: vi.fn(),
            reset: vi.fn()
        },
        capture: vi.fn()
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
            imports: [AccountFormComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuth },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: SyncService, useValue: mockSync },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: LlmService, useValue: mockLlmService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountFormComponent);
    });

    it('executes Step1SelectType story interaction test', async () => {
        fixture.detectChanges();

        await Step1SelectType.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Select Account Type');
        expect(fixture.nativeElement.textContent).toContain('Checking');
        expect(fixture.nativeElement.textContent).toContain('Savings');
    });

    it('executes Step2EnterDetails story interaction test', async () => {
        fixture.detectChanges();

        await Step2EnterDetails.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Account Details');
        const nameInput = fixture.nativeElement.querySelector(
            '#account-name-input'
        ) as HTMLInputElement;
        expect(nameInput?.value).toBe('Main Checking');
    });

    it('renders MobileViewport story', () => {
        fixture.detectChanges();
        expect(MobileViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Select Account Type');
    });

    it('renders TabletViewport story', () => {
        fixture.detectChanges();
        expect(TabletViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Select Account Type');
    });

    it('renders DarkMode story', () => {
        fixture.detectChanges();
        expect(DarkMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Select Account Type');
    });

    it('renders LightMode story', () => {
        fixture.detectChanges();
        expect(LightMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Select Account Type');
    });
});
