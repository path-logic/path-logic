import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AccountType, TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { DashboardComponent } from './dashboard.component';

const mockLedgerStore = {
    transactions: signal([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-10',
            payee: 'Uber Trip',
            totalAmount: -2240,
            status: TransactionStatus.Cleared,
            splits: []
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-01',
            payee: 'Employer Tech Direct Deposit',
            totalAmount: 480000,
            status: TransactionStatus.Cleared,
            splits: []
        }
    ]),
    accounts: signal([
        {
            id: 'acc-1',
            name: 'Checking Account',
            institutionName: 'Chase',
            type: AccountType.Checking,
            clearedBalance: 1487050,
            pendingBalance: 1487050,
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            deletedAt: null
        },
        {
            id: 'acc-2',
            name: 'Emergency Savings',
            institutionName: 'Marcus',
            type: AccountType.Savings,
            clearedBalance: 4532110,
            pendingBalance: 4532110,
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            deletedAt: null
        },
        {
            id: 'acc-3',
            name: 'Gold Card',
            institutionName: 'Amex',
            type: AccountType.Credit,
            clearedBalance: 125060,
            pendingBalance: 125060,
            isActive: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            deletedAt: null
        }
    ]),
    schedules: signal([
        {
            id: 'sch-1',
            payee: 'Apartment Lease',
            amount: -210000,
            frequency: 'monthly',
            startDate: '2026-08-01',
            nextDueDate: '2026-09-01'
        },
        {
            id: 'sch-2',
            payee: 'Fiber Internet',
            amount: -7000,
            frequency: 'monthly',
            startDate: '2026-08-15',
            nextDueDate: '2026-09-15'
        }
    ]),
    payees: signal([
        { id: 'p-1', name: 'Uber' },
        { id: 'p-2', name: 'Apartment Lease' }
    ]),
    isInitialized: signal(true),
    syncStatus: signal('synced'),
    authError: signal(false),
    hasLocalFallback: signal(true),
    addTransaction: async () => {}
};

const mockAuthService = {
    currentUser: signal({
        displayName: 'Alex Mercer',
        email: 'alex@pathlogic.io'
    }),
    accessToken: signal('mock-token'),
    signOut: () => {}
};

const mockSyncService = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const meta: Meta<DashboardComponent> = {
    title: 'Pages/Dashboard',
    component: DashboardComponent,
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
                provideNoopAnimations(),
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<DashboardComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify Overview header
        await expect(
            canvas.getByRole('heading', { name: /Portfolio Overview/i })
        ).toBeInTheDocument();

        // Verify sections
        await expect(canvas.getByText(/Account Portfolio/i)).toBeInTheDocument();
        await expect(
            canvas.getAllByRole('button', { name: /Quick Entry/i })[0]
        ).toBeInTheDocument();
        await expect(canvas.getAllByText(/90-Day Cashflow Forecast/i)[0]).toBeInTheDocument();
        await expect(canvas.getByText(/Recent Activity/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Upcoming/i)).toBeInTheDocument();
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    }
};

export const LightMode: Story = {
    parameters: {
        theme: 'light'
    }
};
