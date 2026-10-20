import type { Signal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../services/auth/auth.service';
import { CommandPaletteService } from '../../services/command-palette/command-palette.service';
import { FeatureFlagService } from '../../services/feature-flag/feature-flag.service';
import { GeminiService } from '../../services/gemini/gemini.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { LlmProvider, LlmService } from '../../services/llm/llm.service';
import { PostHogService } from '../../services/posthog/posthog.service';
import { SecurityManagerService } from '../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../services/sync/sync.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { SettingsPageComponent } from './settings-page.component';
import {
    DarkMode,
    Default,
    LightMode,
    MobileViewport,
    TabletViewport
} from './settings-page.component.stories';

class MockFeatureFlagService {
    private flags = signal<Record<string, boolean>>({
        enable_multi_user: false
    });

    isEnabled(flag: string): Signal<boolean> {
        return computed(() => !!this.flags()[flag]);
    }

    toggle(flag: string, enabled: boolean): void {
        this.flags.update(prev => ({ ...prev, [flag]: enabled }));
    }
}

describe('SettingsPageComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<SettingsPageComponent>;

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
        payees: signal<Array<any>>([]),
        categories: signal<Array<any>>([])
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
        settings: signal<Record<string, string>>({}),
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
        selectedProvider: signal(LlmProvider.Gemini),
        selectedModel: signal('gemini-2.5-flash'),
        apiKey: signal('mock-gemini-key'),
        hasKey: signal(true),
        newerModelAlert: signal<any>(null),
        checkStartupNewerModel: vi.fn().mockResolvedValue(undefined),
        upgradeToNewestModel: vi.fn().mockResolvedValue(undefined),
        dismissModelUpgrade: vi.fn().mockResolvedValue(undefined),
        setProvider: vi.fn(),
        setModel: vi.fn(),
        listModels: vi.fn().mockResolvedValue([]),
        setApiKey: vi.fn().mockResolvedValue(undefined)
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [SettingsPageComponent],
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
                { provide: SyncService, useValue: mockSyncService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore },
                { provide: SidebarContextService, useValue: mockSidebarContextService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: LlmService, useValue: mockLlmService },
                { provide: FeatureFlagService, useClass: MockFeatureFlagService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsPageComponent);
    });

    it('executes Default story interaction test', async () => {
        fixture.detectChanges();

        const originalShowGuideSet = fixture.componentInstance.showGuide.set.bind(
            fixture.componentInstance.showGuide
        );
        vi.spyOn(fixture.componentInstance.showGuide, 'set').mockImplementation((val: boolean) => {
            originalShowGuideSet(val);
            fixture.detectChanges();
        });

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('System Settings');
        expect(fixture.nativeElement.textContent).toContain('AI Integration');
        expect(fixture.nativeElement.textContent).toContain('Data Backup');
        expect(fixture.nativeElement.textContent).toContain('Appearance');
    }, 15000);

    it('renders LightMode story', () => {
        fixture.detectChanges();
        expect(LightMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('System Settings');
    });

    it('renders DarkMode story', () => {
        fixture.detectChanges();
        expect(DarkMode).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('System Settings');
    });

    it('renders MobileViewport story', () => {
        fixture.detectChanges();
        expect(MobileViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('System Settings');
    });

    it('renders TabletViewport story', () => {
        fixture.detectChanges();
        expect(TabletViewport).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('System Settings');
    });
});
