import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevMaintenanceComponent, DevMaintenanceStorageService } from './dev-maintenance.component';

export const mockAccounts = signal<Array<any>>([
    { id: 'acc-1', name: 'Primary Checking', type: 'Checking', isActive: true },
    { id: 'acc-2', name: 'High Yield Savings', type: 'Savings', isActive: true },
    { id: 'acc-3', name: 'Legacy Card', type: 'Credit', isActive: false }
]);

export const mockPayees = signal<Array<any>>([
    { id: 'payee-1', name: 'Austin Energy', notes: 'Monthly utility' },
    { id: 'payee-2', name: 'Google Fiber', notes: 'Internet service' }
]);

export const mockCategories = signal<Array<any>>([
    { id: 'cat-1', name: 'Housing', description: 'Rent & Mortgage', parentId: null },
    { id: 'cat-2', name: 'Utilities', description: 'Electric, Gas, Water', parentId: 'cat-1' }
]);

export const mockAuthService = {
    accessToken: signal<string | null>('mock-dev-token-9988'),
    currentUser: signal<any>({ uid: 'mock-user-id', email: 'dev@pathlogic.io' }),
    isLoggedIn: signal<boolean>(true)
};

export const mockLedgerStore = {
    isInitialized: signal<boolean>(true),
    initialize: async () => {},
    reset: () => {},
    accounts: mockAccounts,
    payees: mockPayees,
    categories: mockCategories,
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    syncStatus: signal<string>('synced'),
    authError: signal<boolean>(false),
    hasLocalFallback: signal<boolean>(true),
    syncConflicts: signal<Array<any>>([]),
    mergeCount: signal<number>(0)
};

export const mockSecurityManager = {
    isIdle: signal<boolean>(false),
    startMonitoring: () => {},
    resetTimers: () => {}
};

export const mockSyncService = {
    isSyncing: signal<boolean>(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

export const mockStorageService = {
    factoryResetDrive: async () => {},
    clearLocalSnapshot: async () => {},
    softDeleteAccount: () => {},
    deletePayee: () => {},
    deleteCategory: () => {}
};

const meta: Meta<DevMaintenanceComponent> = {
    title: 'Pages/Settings/Dev/DevMaintenanceComponent',
    component: DevMaintenanceComponent,
    includeStories: /^[A-Z]/,
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
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService },
                { provide: DevMaintenanceStorageService, useValue: mockStorageService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<DevMaintenanceComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('heading', { name: /System Maintenance/i, level: 1 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /Factory Reset/i, level: 2 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /Database Explorer/i, level: 2 })
        ).toBeInTheDocument();
        await expect(canvas.getByText('Primary Checking')).toBeInTheDocument();
    }
};

export const PayeesTab: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const payeesTabBtn = canvas.getByRole('button', { name: /Payees/i });
        await userEvent.click(payeesTabBtn);
        await expect(await canvas.findByText('Austin Energy')).toBeInTheDocument();
        await expect(await canvas.findByText('Google Fiber')).toBeInTheDocument();
    }
};

export const CategoriesTab: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const categoriesTabBtn = canvas.getByRole('button', { name: /Categories/i });
        await userEvent.click(categoriesTabBtn);
        await expect(await canvas.findByText('Housing')).toBeInTheDocument();
        await expect(await canvas.findByText('Utilities')).toBeInTheDocument();
    }
};

export const InteractiveExplorer: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify initial Accounts view', async () => {
            await expect(canvas.getByText('Primary Checking')).toBeInTheDocument();
        });

        await step('Switch to Payees tab', async () => {
            const payeesTabBtn = canvas.getByRole('button', { name: /Payees/i });
            await userEvent.click(payeesTabBtn);
            await expect(await canvas.findByText('Austin Energy')).toBeInTheDocument();
        });

        await step('Switch to Categories tab', async () => {
            const categoriesTabBtn = canvas.getByRole('button', { name: /Categories/i });
            await userEvent.click(categoriesTabBtn);
            await expect(await canvas.findByText('Housing')).toBeInTheDocument();
        });

        await step('Click Refresh State button', async () => {
            const refreshBtn = canvas.getByRole('button', { name: /Refresh State/i });
            await userEvent.click(refreshBtn);
            await expect(refreshBtn).toBeInTheDocument();
        });

        await step('Switch back to Accounts tab', async () => {
            const accountsTabBtn = canvas.getByRole('button', { name: /Accounts/i });
            await userEvent.click(accountsTabBtn);
            await expect(await canvas.findByText('Primary Checking')).toBeInTheDocument();
        });
    }
};
