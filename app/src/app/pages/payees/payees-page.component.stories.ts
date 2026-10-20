import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { IPayee } from '@core';
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
import { PayeesPageComponent } from './payees-page.component';

const mockDefaultPayees: Array<IPayee> = [
    {
        id: 'p-1',
        name: 'Austin Energy',
        address: '721 Barton Springs Rd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78704',
        latitude: 30.2601,
        longitude: -97.7508,
        website: 'https://austinenergy.com',
        phone: '512-494-9400',
        notes: 'Electric utility provider',
        defaultCategoryId: 'cat-utilities',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'p-2',
        name: 'Starbucks Coffee',
        address: '500 W 5th St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        latitude: 30.2685,
        longitude: -97.7476,
        website: 'https://starbucks.com',
        phone: '512-555-0199',
        notes: 'Downtown coffee shop',
        defaultCategoryId: 'cat-coffee',
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z'
    },
    {
        id: 'p-3',
        name: 'Starbucks #1234',
        address: '100 Congress Ave',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: 'Duplicate espresso bar',
        defaultCategoryId: 'cat-coffee',
        createdAt: '2026-01-03T00:00:00Z',
        updatedAt: '2026-01-03T00:00:00Z'
    }
];

const createMockLedgerStore = (payeesList: Array<IPayee> = mockDefaultPayees) => ({
    payees: signal<Array<IPayee>>(payeesList),
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    recurringSchedules: signal<Array<any>>([]),
    accounts: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    isInitialized: signal<boolean>(true),
    isLoading: signal<boolean>(false),
    syncStatus: signal<string>('idle'),
    authError: signal<boolean>(false),
    hasLocalFallback: signal<boolean>(true),
    syncConflicts: signal<Array<any>>([]),
    mergeCount: signal<number>(0),
    mergePayees: fn(async () => ({ affectedTransactions: 1, affectedSchedules: 0 })),
    addPayee: fn(async () => {}),
    updatePayee: fn(async () => {})
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

const createMockUserSettingsStore = () => ({
    settings: signal<Record<string, string>>({}),
    isLoading: signal<boolean>(false),
    primaryAccountId: signal<string | null>(null),
    getSetting: fn()
});

const meta: Meta<PayeesPageComponent> = {
    title: 'Pages/PayeesPage',
    component: PayeesPageComponent,
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
                { provide: LedgerStore, useValue: createMockLedgerStore() },
                { provide: AuthService, useValue: createMockAuthService() },
                { provide: SecurityManagerService, useValue: createMockSecurityManager() },
                { provide: SyncService, useValue: createMockSyncService() },
                { provide: LlmService, useValue: createMockLlmService() },
                { provide: AiAssistantService, useValue: createMockAiAssistantService() },
                { provide: GeminiService, useValue: createMockGeminiService() },
                { provide: ThemeService, useValue: createMockThemeService() },
                { provide: CommandPaletteService, useValue: createMockCommandPaletteService() },
                { provide: SidebarContextService, useValue: createMockSidebarContextService() },
                { provide: UserSettingsStore, useValue: createMockUserSettingsStore() }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<PayeesPageComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Verify Payee table / directory list
        await expect(canvas.getByRole('heading', { name: /Payee/i, level: 1 })).toBeInTheDocument();
        await expect(canvas.getByText('Austin Energy')).toBeInTheDocument();
        await expect(canvas.getByText('Starbucks Coffee')).toBeInTheDocument();
        await expect(canvas.getByText('Starbucks #1234')).toBeInTheDocument();

        // 2. Test search filtering
        const searchInput = canvas.getByPlaceholderText(/Search payees by name, city, or notes/i);
        await userEvent.type(searchInput, 'Energy');

        await expect(canvas.getByText('Austin Energy')).toBeInTheDocument();
        await expect(canvas.queryByText('Starbucks Coffee')).not.toBeInTheDocument();
        await expect(canvas.queryByText('Starbucks #1234')).not.toBeInTheDocument();

        await userEvent.clear(searchInput);
        await expect(canvas.getByText('Starbucks Coffee')).toBeInTheDocument();

        // 3. Test merge action (ensure desktop viewport for merge availability)
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        }
        const mergeBtn = canvas.getByRole('button', { name: /Merge Payees/i });
        await userEvent.click(mergeBtn);

        // Verify merge dialog is displayed
        await expect(
            canvas.getByText(/Combine duplicate records into a single primary payee/i)
        ).toBeInTheDocument();

        // Close merge dialog
        const closeBtn = canvas.getByRole('button', { name: /Close merge dialog/i });
        await userEvent.click(closeBtn);
        await expect(
            canvas.queryByText(/Combine duplicate records into a single primary payee/i)
        ).not.toBeInTheDocument();
    }
};

export const EmptyState: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: createMockLedgerStore([]) }]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify empty state display
        await expect(canvas.getByText(/No payees registered yet/i)).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: /Add Payee/i })).toBeInTheDocument();
    }
};
