import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantService } from '../../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../../services/command-palette/command-palette.service';
import { GeminiService } from '../../../../services/gemini/gemini.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { LlmService } from '../../../../services/llm/llm.service';
import { PostHogService } from '../../../../services/posthog/posthog.service';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { ThemeService } from '../../../../services/theme/theme.service';
import { UserSettingsStore } from '../../../../services/user-settings-store/user-settings.store';
import { QifTestComponent } from './qif-test.component';
import { Default, WithDiagnosticsLoaded } from './qif-test.component.stories';

describe('QifTestComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<QifTestComponent>;

    const mockCategories = signal<Array<any>>([
        { id: 'cat-1', name: 'Groceries' },
        { id: 'cat-2', name: 'Salary' }
    ]);

    const mockLedgerStore = {
        categories: mockCategories,
        accounts: signal<Array<any>>([]),
        transactions: signal<Array<any>>([]),
        schedules: signal<Array<any>>([]),
        recurringSchedules: signal<Array<any>>([]),
        payees: signal<Array<any>>([]),
        isInitialized: signal(true),
        isLoading: signal(false),
        syncStatus: signal('synced'),
        authError: signal(false),
        hasLocalFallback: signal(true),
        syncConflicts: signal<Array<any>>([]),
        mergeCount: signal(0),
        getCategoryAlias: vi.fn((alias: string) =>
            alias.toLowerCase() === 'food' ? 'cat-1' : null
        )
    };

    const mockAuthService = {
        currentUser: signal({
            displayName: 'Alex Mercer',
            email: 'alex@example.com'
        }),
        accessToken: signal<string | null>(null),
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
            imports: [QifTestComponent],
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
                { provide: LlmService, useValue: mockLlmService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(QifTestComponent);
    });

    it('executes Default story interaction test', async () => {
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Upload QIF File');
        expect(fixture.nativeElement.textContent).toContain('No file selected yet');
    });

    it('executes WithDiagnosticsLoaded story interaction test', async () => {
        fixture.detectChanges();

        const originalOnFileSelected = fixture.componentInstance.onFileSelected.bind(
            fixture.componentInstance
        );
        vi.spyOn(fixture.componentInstance, 'onFileSelected').mockImplementation(
            async (event: Event) => {
                await originalOnFileSelected(event);
                fixture.detectChanges();
            }
        );

        await WithDiagnosticsLoaded.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Explicit Status Breakdown');
        expect(fixture.nativeElement.textContent).toContain('Account Creation Import');
        expect(fixture.nativeElement.textContent).toContain('Ongoing Reconciliation Import');
    });
});
