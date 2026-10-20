import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';
import { expect, fn, within } from 'storybook/test';

import { AppComponent } from './app.component';
import { AppShellComponent } from './components/layout/app-shell/app-shell.component';
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

@Component({
    selector: 'app-story-host',
    standalone: true,
    imports: [AppComponent, AppShellComponent],
    template: `
        <root />
        <shell>
            <div data-testid="mock-shell-content" class="space-y-4 p-6">
                <h1 class="text-2xl font-bold">Financial Overview</h1>
                <p class="text-sm text-surface-500">
                    Welcome to Path Logic local-first accounting.
                </p>
            </div>
        </shell>
    `
})
export class AppStoryHostComponent {}

const createMockAuthService = (
    user: {
        uid: string;
        displayName: string | null;
        email: string;
        photoURL: string | null;
    } | null = null
) => ({
    currentUser: signal(user),
    accessToken: signal<string | null>(user ? 'valid-oauth-token' : null),
    isLoggedIn: signal<boolean>(user !== null),
    isInitializing: signal<boolean>(false),
    signOut: fn(async () => {}),
    signInWithGoogle: fn(async () => {})
});

const createMockLedgerStore = () => ({
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
    initialize: fn(async () => {}),
    commitToLocal: fn(async () => {})
});

const createMockSecurityManager = () => ({
    isIdle: signal<boolean>(false),
    startMonitoring: fn(),
    resetTimers: fn()
});

const createMockSyncService = () => ({
    isSyncing: signal<boolean>(false),
    initFromLocal: fn(async () => true),
    syncFromDrive: fn(async () => {}),
    saveToDrive: fn(async () => {}),
    getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
});

const createMockPostHogService = () => ({
    init: fn(),
    posthog: { capture: fn() }
});

const createMockThemeService = () => ({
    resolvedTheme: signal<string>('light'),
    setTheme: fn(),
    toggleTheme: fn()
});

const createMockFaviconService = () => ({
    updateFavicon: fn()
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

const createMockGeminiService = () => ({
    hasKey: () => true,
    apiKey: () => 'mock-api-key'
});

const createMockSidebarContextService = () => ({
    customTemplate: signal<any>(null),
    isNavSectionCollapsed: signal<boolean>(false),
    navPosition: signal<'top' | 'bottom'>('top'),
    hasContext: signal<boolean>(false),
    setContext: fn(),
    clearContext: fn(),
    setNavPosition: fn(),
    toggleNavSection: fn(),
    toggleNavPosition: fn()
});

const createMockUserSettingsStore = () => ({
    settings: signal<Record<string, string>>({}),
    isLoading: signal<boolean>(false),
    primaryAccountId: signal<string | null>(null),
    getSetting: fn()
});

const meta: Meta<AppComponent> = {
    title: 'App/Root',
    component: AppComponent,
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
                providePrimeNG({
                    theme: {
                        preset: Lara,
                        options: {
                            darkModeSelector: '.dark'
                        }
                    }
                }),
                { provide: AuthService, useValue: createMockAuthService() },
                { provide: LedgerStore, useValue: createMockLedgerStore() },
                { provide: SecurityManagerService, useValue: createMockSecurityManager() },
                { provide: SyncService, useValue: createMockSyncService() },
                { provide: PostHogService, useValue: createMockPostHogService() },
                { provide: ThemeService, useValue: createMockThemeService() },
                { provide: FaviconService, useValue: createMockFaviconService() },
                { provide: CommandPaletteService, useValue: createMockCommandPaletteService() },
                { provide: LlmService, useValue: createMockLlmService() },
                { provide: AiAssistantService, useValue: createMockAiAssistantService() },
                { provide: GeminiService, useValue: createMockGeminiService() },
                { provide: SidebarContextService, useValue: createMockSidebarContextService() },
                { provide: UserSettingsStore, useValue: createMockUserSettingsStore() }
            ]
        }),
        moduleMetadata({
            imports: [AppStoryHostComponent]
        })
    ]
};

export default meta;
type Story = StoryObj<AppComponent>;

export const Default: Story = {
    render: () => ({
        template: '<app-story-host />'
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Verify app-shell mounting
        const shell = canvasElement.querySelector('shell');
        await expect(shell).toBeInTheDocument();

        // 2. Verify routed shell content
        await expect(canvas.getByText('Financial Overview')).toBeInTheDocument();
        await expect(canvas.getByText(/Welcome to Path Logic/i)).toBeInTheDocument();

        // 3. Verify app elements (command palette mounted)
        await expect(canvasElement.querySelector('app-command-palette')).toBeInTheDocument();
    }
};

export const WithUserSession: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: AuthService,
                    useValue: createMockAuthService({
                        uid: 'user-123',
                        displayName: 'Alex Mercer',
                        email: 'alex.mercer@pathlogic.io',
                        photoURL: null
                    })
                }
            ]
        })
    ],
    render: () => ({
        template: '<app-story-host />'
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Verify app-shell is mounted
        const shell = canvasElement.querySelector('shell');
        await expect(shell).toBeInTheDocument();

        // 2. Verify routed shell content
        await expect(canvas.getByText('Financial Overview')).toBeInTheDocument();

        // 3. Verify authenticated user details in shell
        const userElements = canvas.getAllByText(/Alex Mercer/i);
        await expect(userElements.length).toBeGreaterThan(0);
    }
};
