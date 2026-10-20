import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import type { ITransactionConflict } from '../../../../lib/sync/MergeEngine';
import { AiAssistantService } from '../../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../../services/command-palette/command-palette.service';
import { GeminiService } from '../../../../services/gemini/gemini.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { LlmService } from '../../../../services/llm/llm.service';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SidebarContextService } from '../../../../services/sidebar-context/sidebar-context.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { ThemeService } from '../../../../services/theme/theme.service';
import { SyncTestComponent } from './sync-test.component';

const mockSyncConflicts = signal<Array<ITransactionConflict>>([]);
const mockSyncStatus = signal<string>('synced');
const mockSyncError = signal<string | null>(null);

const mockLedgerStore = {
    accounts: signal<Array<any>>([]),
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    recurringSchedules: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    isInitialized: signal<boolean>(true),
    syncStatus: mockSyncStatus,
    syncError: mockSyncError,
    authError: signal<boolean>(false),
    hasLocalFallback: signal<boolean>(true),
    mergeCount: signal<number>(0),
    syncConflicts: mockSyncConflicts,
    resolveConflict: async (id: string, _keepMine: boolean) => {
        mockSyncConflicts.update((conflicts: Array<ITransactionConflict>) =>
            conflicts.filter(c => c.id !== id)
        );
    }
};

const mockAuthService = {
    currentUser: signal({
        displayName: 'Dev Engineer',
        email: 'dev@pathlogic.io',
        photoURL: null
    }),
    accessToken: signal<string | null>('mock-token'),
    signOut: async () => {},
    signInWithGoogle: async () => {}
};

const mockSyncService = {
    isSyncing: signal<boolean>(false),
    saveToDrive: async (_forceImmediate?: boolean) => {},
    syncFromDrive: async () => {},
    getSyncStatus: () => ({ inProgress: false, lastSyncTime: 1700000000000 })
};

const mockSecurityManager = {
    isIdle: signal<boolean>(false),
    startMonitoring: () => {},
    resetTimers: () => {}
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

const meta: Meta<SyncTestComponent> = {
    title: 'Pages/Settings/Dev/SyncTest',
    component: SyncTestComponent,
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
                { provide: SyncService, useValue: mockSyncService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
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
type Story = StoryObj<SyncTestComponent>;

export const Default: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify diagnostic page header and sections', async () => {
            await expect(
                canvas.getByRole('heading', { name: /Sync Test Suite/i })
            ).toBeInTheDocument();
            await expect(canvas.getByText('Back to Dev Tools')).toBeInTheDocument();
            await expect(canvas.getByText(/1. Sync Triggers/i)).toBeInTheDocument();
            await expect(canvas.getByText(/2. Conflict Simulation/i)).toBeInTheDocument();
            await expect(
                canvas.getByText(/3. Network Status & Error Simulation/i)
            ).toBeInTheDocument();
        });

        await step('Verify initial online status and trigger buttons', async () => {
            const networkBadge = canvasElement.querySelector(
                '#network-status-badge'
            ) as HTMLElement;
            await expect(within(networkBadge).getByText('Online')).toBeInTheDocument();
            await expect(
                canvas.getByRole('button', { name: /Immediate Drive Save/i })
            ).toBeInTheDocument();
            await expect(
                canvas.getByRole('button', { name: /Check & Merge Drive Sync/i })
            ).toBeInTheDocument();
        });
    }
};

export const SimulatedConflictState: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Click simulate conflict button', async () => {
            const simBtn = canvas.getByRole('button', { name: /Simulate Conflict/i });
            await userEvent.click(simBtn);
        });

        await step('Verify conflict item is rendered in queue', async () => {
            const conflictItem = canvasElement.querySelector(
                '[data-testid="conflict-item-0"]'
            ) as HTMLElement;
            await expect(conflictItem).toBeInTheDocument();
            await expect(
                within(conflictItem).getByText(/Local Roaster \(Mine\)/i)
            ).toBeInTheDocument();
            await expect(
                within(conflictItem).getByText(/Local Roaster \(Drive\)/i)
            ).toBeInTheDocument();
        });

        await step('Resolve conflict by clicking Keep Mine', async () => {
            const keepMineBtn = canvasElement.querySelector('#btn-keep-mine-0') as HTMLElement;
            await userEvent.click(keepMineBtn);
            const conflictBadge = canvasElement.querySelector(
                '#conflict-count-badge'
            ) as HTMLElement;
            await expect(within(conflictBadge).getByText(/0 Conflicts/i)).toBeInTheDocument();
        });
    }
};

export const SimulatedOfflineAndErrorState: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Toggle to offline network state', async () => {
            const toggleBtn = canvas.getByRole('button', {
                name: /Toggle Network Online\/Offline/i
            });
            await userEvent.click(toggleBtn);
            const networkBadge = canvasElement.querySelector(
                '#network-status-badge'
            ) as HTMLElement;
            await expect(within(networkBadge).getByText('Offline')).toBeInTheDocument();
            const syncBadge = canvasElement.querySelector('#sync-status-badge') as HTMLElement;
            await expect(within(syncBadge).getByText('pending-local')).toBeInTheDocument();
        });

        await step('Simulate sync error and verify banner', async () => {
            const errorBtn = canvas.getByRole('button', { name: /Simulate Sync Error/i });
            await userEvent.click(errorBtn);
            await expect(
                canvas.getByText(/Error: Simulated 503 Service Unavailable/i)
            ).toBeInTheDocument();
        });

        await step('Reset sync status', async () => {
            const resetBtn = canvas.getByRole('button', { name: /Reset Status/i });
            await userEvent.click(resetBtn);
            const syncBadge = canvasElement.querySelector('#sync-status-badge') as HTMLElement;
            await expect(within(syncBadge).getByText('synced')).toBeInTheDocument();
        });
    }
};
