import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SidebarNavComponent } from './sidebar-nav.component';

const mockLedgerStore = {
    transactions: signal([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-01',
            payee: 'Direct Deposit',
            totalAmount: 450000,
            status: 'cleared',
            splits: []
        }
    ]),
    accounts: signal([
        {
            id: 'acc-1',
            name: 'Primary Checking',
            institutionName: 'Chase',
            type: 'checking',
            balance: 450000
        },
        {
            id: 'acc-2',
            name: 'High Yield Savings',
            institutionName: 'Marcus',
            type: 'savings',
            balance: 1250000
        }
    ]),
    recurringSchedules: signal([
        { id: 'rec-1', name: 'Rent Payment', amount: -210000 },
        { id: 'rec-2', name: 'Internet Utility', amount: -8000 }
    ]),
    syncStatus: signal('idle'),
    authError: signal(false),
    isInitialized: signal(true),
    hasLocalFallback: signal(true)
};

const mockAuthService = {
    currentUser: signal({
        displayName: 'Alex Mercer',
        email: 'alex@pathlogic.io',
        photoURL: null
    }),
    signOut: () => {}
};

const mockSyncService = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const meta: Meta<SidebarNavComponent> = {
    title: 'Layout/SidebarNav',
    component: SidebarNavComponent,
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: true }]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<SidebarNavComponent>;

export const Default: Story = {
    render: () => ({
        template: `
            <div class="h-screen w-64 bg-surface-50">
                <sidebar-nav></sidebar-nav>
            </div>
        `
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify primary nav links
        await expect(canvas.getByText(/Overview/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Accounts/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Recurring/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Payees/i)).toBeInTheDocument();

        // Verify User Profile
        await expect(canvas.getByText(/Alex Mercer/i)).toBeInTheDocument();

        // Test user menu dropdown contains Settings and Sign Out
        const userMenuBtn = canvas.getByRole('button', { name: /User Account Menu/i });
        await userEvent.click(userMenuBtn);
        await expect(canvas.getByText(/Settings/i)).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    }
};

export const Collapsed: Story = {
    render: () => ({
        template: `
            <div class="h-screen w-20 bg-surface-50">
                <sidebar-nav></sidebar-nav>
            </div>
        `
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const collapseBtn = canvas.getByRole('button', { name: /Collapse Sidebar/i });
        await userEvent.click(collapseBtn);
        await expect(canvas.getByRole('button', { name: /Expand Sidebar/i })).toBeInTheDocument();
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    },
    render: () => ({
        template: `
            <div class="h-screen w-64 bg-surface-950 dark">
                <sidebar-nav></sidebar-nav>
            </div>
        `
    })
};

export const LightMode: Story = {
    parameters: {
        theme: 'light'
    },
    render: () => ({
        template: `
            <div class="h-screen w-64 bg-surface-50">
                <sidebar-nav></sidebar-nav>
            </div>
        `
    })
};
