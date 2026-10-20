import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

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
import { StyleGuideComponent } from './style-guide.component';

const mockSecurityManager = {
    isIdle: signal<boolean>(false),
    startMonitoring: () => {},
    resetTimers: () => {}
};

const mockLedgerStore = {
    accounts: signal<Array<any>>([]),
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    recurringSchedules: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    isInitialized: signal<boolean>(true),
    syncStatus: signal<string>('synced'),
    authError: signal<boolean>(false),
    hasLocalFallback: signal<boolean>(true),
    mergeCount: signal<number>(0),
    syncConflicts: signal<Array<any>>([])
};

const mockAuthService = {
    currentUser: signal({
        displayName: 'Design Architect',
        email: 'designer@pathlogic.io',
        photoURL: null
    }),
    accessToken: signal<string | null>('mock-valid-token'),
    signOut: async () => {},
    signInWithGoogle: async () => {}
};

const mockSyncService = {
    isSyncing: signal<boolean>(false),
    getSyncStatus: () => ({ inProgress: false, lastSyncTime: 1700000000000 })
};

const mockLlmService = {
    newerModelAlert: signal<any>(null),
    checkStartupNewerModel: async () => {},
    upgradeToNewestModel: async () => {},
    dismissModelUpgrade: async () => {}
};

const mockAiAssistantService = {
    isOpen: signal<boolean>(false),
    messages: signal<Array<any>>([]),
    isSending: signal<boolean>(false),
    toggle: () => {},
    open: () => {},
    close: () => {},
    clearChat: () => {},
    sendMessage: async () => {}
};

const mockGeminiService = {
    hasKey: () => true,
    apiKey: () => 'mock-gemini-key'
};

const mockThemeService = {
    resolvedTheme: signal<string>('dark'),
    setTheme: () => {},
    toggleTheme: () => {}
};

const mockCommandPaletteService = {
    open: () => {},
    close: () => {},
    isOpen: signal<boolean>(false)
};

const mockSidebarContextService = {
    customTemplate: signal<any>(null),
    isNavSectionCollapsed: signal<boolean>(false),
    navPosition: signal<'top' | 'bottom'>('top'),
    hasContext: signal<boolean>(false),
    setContext: () => {},
    clearContext: () => {},
    setNavPosition: () => {},
    toggleNavSection: () => {},
    toggleNavPosition: () => {}
};

const meta: Meta<StyleGuideComponent> = {
    title: 'Pages/Settings/StyleGuide',
    component: StyleGuideComponent,
    tags: ['autodocs'],
    parameters: {
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
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: LlmService, useValue: mockLlmService },
                { provide: AiAssistantService, useValue: mockAiAssistantService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: ThemeService, useValue: mockThemeService },
                { provide: CommandPaletteService, useValue: mockCommandPaletteService },
                { provide: SidebarContextService, useValue: mockSidebarContextService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<StyleGuideComponent>;

export const Default: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify page header and brand title', async () => {
            await expect(canvas.getByText(/Visual Constitution/i)).toBeInTheDocument();
            await expect(canvas.getByText(/Brand Reference/i)).toBeInTheDocument();
        });

        await step('Verify typography and color system sections', async () => {
            await expect(canvas.getByText(/§ 2 · Color System/i)).toBeInTheDocument();
            await expect(canvas.getByText(/§ 3 · Typography System/i)).toBeInTheDocument();
        });

        await step('Verify button specimens and status badges', async () => {
            await expect(canvas.getByRole('button', { name: /Primary/i })).toBeInTheDocument();
            await expect(canvas.getByText('Cleared')).toBeInTheDocument();
            await expect(canvas.getByText('Pending')).toBeInTheDocument();
        });
    }
};

export const InteractiveInputsAndButtons: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Interact with standard input specimen', async () => {
            const input = canvas.getByPlaceholderText('Enter text...');
            await expect(input).toBeInTheDocument();
            await userEvent.clear(input);
            await userEvent.type(input, 'Path Logic Design Token');
            await expect(input).toHaveValue('Path Logic Design Token');
        });

        await step('Interact with currency input specimen', async () => {
            const currencyInput = canvas.getByPlaceholderText('0.00');
            await expect(currencyInput).toBeInTheDocument();
            await userEvent.type(currencyInput, '1250.75');
            await expect(currencyInput).toHaveValue('1250.75');
        });

        await step('Verify disabled input state cannot be altered', async () => {
            const disabledInput = canvas.getByDisplayValue('Read-only value');
            await expect(disabledInput).toBeDisabled();
        });
    }
};
