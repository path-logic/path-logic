import { signal } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString,
    type ITransaction
} from '../../../core';
import { AuthService } from '../../../services/auth/auth.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SyncService } from '../../../services/sync/sync.service';
import { AccountLedgerComponent } from './account-ledger.component';

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 542000 as Cents,
        pendingBalance: 542000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'acc-2',
        name: 'High Yield Savings',
        type: AccountType.Savings,
        institutionName: 'Ally',
        clearedBalance: 1500000 as Cents,
        pendingBalance: 1500000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    }
];

const mockTransactions: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acc-1',
        date: '2026-08-15' as ISODateString,
        payee: 'Whole Foods Market',
        payeeId: 'p-1',
        memo: 'Weekly produce',
        totalAmount: -4250 as Cents,
        status: TransactionStatus.Cleared,
        splits: [{ id: 's-1', amount: -4250 as Cents, categoryId: 'c-1', memo: '' }],
        checkNumber: null,
        importHash: 'h-1',
        createdAt: '2026-08-15T00:00:00Z' as ISODateString,
        updatedAt: '2026-08-15T00:00:00Z' as ISODateString
    },
    {
        id: 'tx-2',
        accountId: 'acc-1',
        date: '2026-08-14' as ISODateString,
        payee: 'Path Logic Inc. (Salary)',
        payeeId: 'p-2',
        memo: 'Biweekly Paycheck',
        totalAmount: 240000 as Cents,
        status: TransactionStatus.Cleared,
        splits: [{ id: 's-2', amount: 240000 as Cents, categoryId: 'c-2', memo: '' }],
        checkNumber: null,
        importHash: 'h-2',
        createdAt: '2026-08-14T00:00:00Z' as ISODateString,
        updatedAt: '2026-08-14T00:00:00Z' as ISODateString
    }
];

const mockLedgerStore = {
    accounts: signal(mockAccounts),
    transactions: signal(mockTransactions),
    payees: signal<Array<IPayee>>([]),
    categories: signal<Array<ICategory>>([]),
    syncStatus: signal('idle'),
    authError: signal(null),
    hasLocalFallback: signal(true),
    deleteTransaction: () => {},
    updateTransaction: () => {},
    applyReconciliationBatch: () => {}
};

const mockSyncService = {
    isSyncing: signal(false),
    sync: () => {},
    startAutoSync: () => {},
    stopAutoSync: () => {}
};

const mockAuthService = {
    user: signal(null),
    isAuthenticated: signal(false),
    logout: () => {}
};

const mockImportService = {
    progress: signal({ stage: 'idle', percent: 0, message: '' }),
    matches: signal([]),
    stats: signal(null),
    unknownCategories: signal<Array<string>>([]),
    handleFile: () => {},
    cancel: () => {},
    reset: () => {}
};

const mockPostHogService = {
    posthog: {
        capture: () => {}
    }
};

const meta: Meta<AccountLedgerComponent> = {
    title: 'Ledger/AccountLedger',
    component: AccountLedgerComponent,
    decorators: [
        moduleMetadata({
            imports: [BrowserAnimationsModule]
        }),
        applicationConfig({
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService }
            ]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<AccountLedgerComponent>;

export const DesktopView: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Active Account/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Recurring Bills/i)).toBeInTheDocument();
    }
};

export const MobileView: Story = {
    parameters: {
        viewport: { defaultViewport: 'mobile1' }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Add Transaction/i)).toBeInTheDocument();
    }
};

export const TabletPortraitView: Story = {
    parameters: {
        viewport: { defaultViewport: 'tablet' }
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    }
};
