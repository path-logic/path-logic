import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppStoryHostComponent, Default, WithUserSession } from './app.component.stories';
import { AiAssistantService } from './services/ai-assistant/ai-assistant.service';
import { AuthService } from './services/auth/auth.service';
import { CommandPaletteService } from './services/command-palette/command-palette.service';
import { FaviconService } from './services/favicon/favicon.service';
import { GeminiService } from './services/gemini/gemini.service';
import { LedgerStore } from './services/ledger-store/ledger.store';
import { LlmService } from './services/llm/llm.service';
import { PostHogService } from './services/posthog/posthog.service';
import { SecurityManagerService } from './services/security-manager/security-manager.service';
import { SidebarContextService } from './services/sidebar-context/sidebar-context.service';
import { SyncService } from './services/sync/sync.service';
import { ThemeService } from './services/theme/theme.service';
import { UserSettingsStore } from './services/user-settings-store/user-settings.store';

describe('AppComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AppStoryHostComponent>;

    const mockCurrentUser = signal<{
        uid: string;
        displayName: string | null;
        email: string;
        photoURL: string | null;
    } | null>(null);

    const mockAuthService = {
        currentUser: mockCurrentUser,
        accessToken: signal<string | null>(null),
        isLoggedIn: signal<boolean>(false),
        isInitializing: signal<boolean>(false),
        signOut: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn().mockResolvedValue(undefined)
    };

    const mockLedgerStore = {
        accounts: signal<Array<any>>([]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        categories: signal<Array<any>>([]),
        payees: signal<Array<any>>([]),
        isInitialized: signal<boolean>(true),
        isLoading: signal<boolean>(false),
        isDirty: signal<boolean>(false),
        syncStatus: signal<string>('idle'),
        authError: signal<boolean>(false),
        hasLocalFallback: signal<boolean>(true),
        mergeCount: signal<number>(0),
        syncConflicts: signal<Array<any>>([]),
        initialize: vi.fn().mockResolvedValue(undefined),
        commitToLocal: vi.fn().mockResolvedValue(undefined)
    };

    const mockSecurityManager = {
        isIdle: signal<boolean>(false),
        startMonitoring: vi.fn(),
        resetTimers: vi.fn()
    };

    const mockSyncService = {
        isSyncing: signal<boolean>(false),
        initFromLocal: vi.fn().mockResolvedValue(true),
        syncFromDrive: vi.fn().mockResolvedValue(undefined),
        saveToDrive: vi.fn().mockResolvedValue(undefined),
        getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
    };

    const mockPostHogService = {
        init: vi.fn(),
        posthog: { capture: vi.fn() }
    };

    const mockThemeService = {
        resolvedTheme: signal<string>('light'),
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
    };

    const mockFaviconService = {
        updateFavicon: vi.fn()
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

    const mockGeminiService = {
        hasKey: () => true,
        apiKey: () => 'mock-api-key'
    };

    const mockSidebarContextService = {
        customTemplate: signal<any>(null),
        isNavSectionCollapsed: signal<boolean>(false),
        navPosition: signal<'top' | 'bottom'>('top'),
        hasContext: signal<boolean>(false),
        setContext: vi.fn(),
        clearContext: vi.fn(),
        setNavPosition: vi.fn(),
        toggleNavSection: vi.fn(),
        toggleNavPosition: vi.fn()
    };

    const mockUserSettingsStore = {
        settings: signal<Record<string, string>>({}),
        isLoading: signal<boolean>(false),
        primaryAccountId: signal<string | null>(null),
        getSetting: vi.fn()
    };

    beforeEach(async () => {
        mockCurrentUser.set(null);
        mockAuthService.accessToken.set(null);
        mockAuthService.isLoggedIn.set(false);

        await TestBed.configureTestingModule({
            imports: [AppStoryHostComponent],
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
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: FaviconService, useValue: mockFaviconService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: LlmService, useValue: mockLlmService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AppStoryHostComponent);
        fixture.detectChanges();
    });

    it('executes Default story interaction test', async () => {
        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.querySelector('shell')).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('Financial Overview');
    });

    it('executes WithUserSession story interaction test', async () => {
        mockCurrentUser.set({
            uid: 'user-123',
            displayName: 'Alex Mercer',
            email: 'alex.mercer@pathlogic.io',
            photoURL: null
        });
        mockAuthService.accessToken.set('valid-oauth-token');
        mockAuthService.isLoggedIn.set(true);
        fixture.detectChanges();

        await WithUserSession.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.querySelector('shell')).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('Alex Mercer');
    });
});
