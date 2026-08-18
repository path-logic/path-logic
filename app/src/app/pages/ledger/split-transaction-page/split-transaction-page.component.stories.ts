import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Cents, IAccount, ICategory, IPayee, ISODateString, ITransaction } from '@core';
import { AccountType, TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SplitTransactionPageComponent } from './split-transaction-page.component';

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Checking Account',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 500000 as Cents,
        pendingBalance: 500000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    }
];

const mockCategories: Array<ICategory> = [
    {
        id: 'cat-income',
        parentId: null,
        name: 'Salary & Wages',
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'cat-tax',
        parentId: null,
        name: 'Taxes',
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'cat-insurance',
        parentId: null,
        name: 'Health Insurance',
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'cat-groceries',
        parentId: null,
        name: 'Groceries',
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    }
];

const mockTransaction: ITransaction = {
    id: 'tx-paycheck',
    accountId: 'acc-1',
    date: '2026-08-15' as ISODateString,
    payee: 'Acme Corp Payroll',
    payeeId: 'p-acme',
    memo: 'Bi-weekly Paycheck',
    totalAmount: 200000 as Cents, // $2,000.00
    status: TransactionStatus.Cleared,
    splits: [
        { id: 's-1', amount: 250000 as Cents, categoryId: 'cat-income', memo: 'Gross Pay' },
        { id: 's-2', amount: -50000 as Cents, categoryId: 'cat-tax', memo: 'Federal & State Tax' }
    ],
    checkNumber: null,
    importHash: 'h-paycheck',
    createdAt: '2026-08-15T00:00:00Z' as ISODateString,
    updatedAt: '2026-08-15T00:00:00Z' as ISODateString
};

const meta: Meta<SplitTransactionPageComponent> = {
    title: 'Pages/Ledger/SplitTransactionPage',
    component: SplitTransactionPageComponent,
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        isInitialized: signal(true),
                        authError: signal(null),
                        hasLocalFallback: signal(true),
                        syncStatus: signal('idle'),
                        accounts: signal(mockAccounts),
                        categories: signal(mockCategories),
                        transactions: signal([mockTransaction]),
                        payees: signal<Array<IPayee>>([]),
                        updateTransaction: () => Promise.resolve()
                    }
                },
                {
                    provide: AuthService,
                    useValue: {
                        accessToken: signal(null),
                        currentUser: signal(null),
                        isLoggedIn: signal(true),
                        isInitializing: signal(false)
                    }
                },
                {
                    provide: SyncService,
                    useValue: {
                        isSyncing: signal(false),
                        getSyncStatus: () => 'idle'
                    }
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: (k: string) => {
                                    if (k === 'accountId') return 'acc-1';
                                    if (k === 'transactionId') return 'tx-paycheck';
                                    return null;
                                }
                            }
                        }
                    }
                }
            ]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<SplitTransactionPageComponent>;

export const DefaultPaycheck: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Split/i)).toBeInTheDocument();
        await expect(canvas.getByText(/PerfectlysBalanced/i)).toBeInTheDocument();
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    }
};
