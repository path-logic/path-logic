import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AccountType } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { AccountInfoComponent } from './account-info.component';

const mockAccounts = signal([
    {
        id: 'acc-1',
        name: 'Chase Checking',
        institutionName: 'JPMorgan Chase',
        type: AccountType.Checking,
        clearedBalance: 342050,
        pendingBalance: 320000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        deletedAt: null
    },
    {
        id: 'acc-loan',
        name: 'Auto Loan',
        institutionName: 'Honda Financial',
        type: AccountType.AutoLoan,
        clearedBalance: -1500000,
        pendingBalance: -1500000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        deletedAt: null,
        loanDetails: {
            originalAmount: 2500000,
            interestRate: 0.045,
            termMonths: 60,
            monthlyPayment: 46600,
            paymentDueDay: 15,
            startDate: '2024-01-01T00:00:00Z',
            metadata: {
                vehicleMake: 'Honda',
                vehicleModel: 'Civic'
            }
        }
    }
]);

const mockUpdateAccount = fn();
const mockLedgerStore = {
    accounts: mockAccounts,
    transactions: signal([]),
    schedules: signal([]),
    payees: signal([]),
    isInitialized: signal(true),
    isLoading: signal(false),
    syncStatus: signal('synced'),
    authError: signal(false),
    hasLocalFallback: signal(true),
    syncConflicts: signal([]),
    mergeCount: signal(0),
    updateAccount: mockUpdateAccount
};

const mockAuth = {
    currentUser: signal({
        displayName: 'Alex Mercer',
        email: 'alex@example.com'
    }),
    accessToken: signal(null),
    isGoogleDriveConnected: signal(false)
};

const mockSync = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const meta: Meta<AccountInfoComponent> = {
    title: 'Pages/AccountInfoComponent',
    component: AccountInfoComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuth },
                { provide: SyncService, useValue: mockSync }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<AccountInfoComponent>;

/**
 * Standard Checking Account Details Page View.
 */
export const CheckingAccountDetailsPageView: Story = {
    args: {
        accountId: 'acc-1'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify page header elements
        await expect(
            canvas.getByRole('heading', { name: /Account Details/i, level: 1 })
        ).toBeInTheDocument();
        await expect(canvas.getByText('JPMorgan Chase')).toBeInTheDocument();
        await expect(canvas.getAllByText(/Checking/i)[0]).toBeInTheDocument();

        // Verify balance cards
        await expect(canvas.getByText('Cleared Balance')).toBeInTheDocument();
        await expect(canvas.getByText('Pending Balance')).toBeInTheDocument();

        // Verify input fields
        const nameInput = canvas.getByLabelText(/account name/i);
        await expect(nameInput).toHaveValue('Chase Checking');

        const institutionInput = canvas.getByLabelText(/institution/i);
        await expect(institutionInput).toHaveValue('JPMorgan Chase');
    }
};

/**
 * Loan Account Details Page View with Financing Terms.
 */
export const LoanAccountDetailsPageView: Story = {
    args: {
        accountId: 'acc-loan'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(
            canvas.getByRole('heading', { name: /Account Details/i, level: 1 })
        ).toBeInTheDocument();
        await expect(canvas.getByText('Honda Financial')).toBeInTheDocument();
        await expect(canvas.getAllByText(/Auto Loan/i)[0]).toBeInTheDocument();

        // Verify loan parameters are displayed
        await expect(canvas.getByText(/loan details/i)).toBeInTheDocument();
        await expect(canvas.getByLabelText(/original principal/i)).toBeInTheDocument();
    }
};
