import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, within } from 'storybook/test';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { LlmService } from '../../../services/llm/llm.service';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../../services/sync/sync.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { AppShellComponent } from './app-shell.component';

const createMockSecurityManager = (isIdle = false) => ({
    isIdle: signal<boolean>(isIdle),
    startMonitoring: fn(),
    resetTimers: fn()
});

const createMockLedgerStore = () => ({
    accounts: signal<Array<any>>([
        {
            id: 'acc-1',
            name: 'Checking Account',
            type: 'checking',
            institutionName: 'Chase',
            currency: 'USD',
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01'
        }
    ]),
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    recurringSchedules: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    isInitialized: signal<boolean>(true),
    syncStatus: signal<string>('idle'),
    authError: signal<boolean>(false),
    hasLocalFallback: signal<boolean>(true),
    mergeCount: signal<number>(0),
    syncConflicts: signal<Array<any>>([])
});

const createMockAuthService = () => ({
    currentUser: signal({
        displayName: 'Alex Morgan',
        email: 'alex.morgan@pathlogic.io',
        photoURL: null
    }),
    accessToken: signal<string | null>('valid-token'),
    signOut: fn(async () => {}),
    signInWithGoogle: fn(async () => {})
});

const createMockSyncService = () => ({
    isSyncing: signal<boolean>(false),
    getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
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

const meta: Meta<AppShellComponent> = {
    title: 'Layout/AppShellComponent',
    component: AppShellComponent,
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
                { provide: SecurityManagerService, useValue: createMockSecurityManager(false) },
                { provide: LedgerStore, useValue: createMockLedgerStore() },
                { provide: AuthService, useValue: createMockAuthService() },
                { provide: SyncService, useValue: createMockSyncService() },
                { provide: LlmService, useValue: createMockLlmService() },
                { provide: AiAssistantService, useValue: createMockAiAssistantService() },
                { provide: GeminiService, useValue: createMockGeminiService() },
                { provide: ThemeService, useValue: createMockThemeService() },
                { provide: CommandPaletteService, useValue: createMockCommandPaletteService() },
                { provide: SidebarContextService, useValue: createMockSidebarContextService() }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<AppShellComponent>;

export const Default: Story = {
    render: () => ({
        template: `
            <shell>
                <div class="space-y-4">
                    <h1 class="text-xl font-bold">Financial Command Center</h1>
                    <p class="text-sm text-surface-500">Welcome to Path Logic local-first accounting.</p>
                </div>
            </shell>
        `
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Financial Command Center')).toBeInTheDocument();
        await expect(canvas.getByText(/Welcome to Path Logic/i)).toBeInTheDocument();
        const overviewElements = canvas.getAllByText('Overview');
        await expect(overviewElements.length).toBeGreaterThan(0);
    }
};

export const NoPaddingFullScreen: Story = {
    render: () => ({
        template: `
            <shell [noPadding]="true">
                <div class="h-full w-full bg-surface-100 p-8 flex items-center justify-center">
                    <span class="text-base font-semibold">Full Canvas Data Visualization</span>
                </div>
            </shell>
        `
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Full Canvas Data Visualization')).toBeInTheDocument();
    }
};

export const NonScrollable: Story = {
    render: () => ({
        template: `
            <shell [scrollable]="false">
                <div class="h-full flex flex-col justify-between">
                    <div>Fixed Header Section</div>
                    <div>Fixed Footer Section</div>
                </div>
            </shell>
        `
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Fixed Header Section')).toBeInTheDocument();
        await expect(canvas.getByText('Fixed Footer Section')).toBeInTheDocument();
    }
};

export const SessionLocked: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: SecurityManagerService, useValue: createMockSecurityManager(true) }
            ]
        })
    ],
    render: () => ({
        template: `
            <shell>
                <div>Sensitive Financial Data Protected Behind Lock Screen</div>
            </shell>
        `
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Session Paused')).toBeInTheDocument();
    }
};
