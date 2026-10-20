import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { IAccount, ICategory, IPayee, ISODateString, ITransaction } from '@core';
import { AccountType, TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { TransactionEntryFormComponent } from './transaction-entry-form.component';

const createMockPayee = (id: string, name: string): IPayee => ({
    id,
    name,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    latitude: null,
    longitude: null,
    website: null,
    phone: null,
    notes: null,
    defaultCategoryId: null,
    createdAt: '2024-01-01T00:00:00Z' as ISODateString,
    updatedAt: '2024-01-01T00:00:00Z' as ISODateString
});

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Checking Account',
        institutionName: 'Chase Bank',
        type: AccountType.Checking,
        clearedBalance: 500000,
        pendingBalance: 500000,
        isActive: true,
        deletedAt: null,
        createdAt: '2024-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2024-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'acc-2',
        name: 'High Yield Savings',
        institutionName: 'Ally',
        type: AccountType.Savings,
        clearedBalance: 1250000,
        pendingBalance: 1250000,
        isActive: true,
        deletedAt: null,
        createdAt: '2024-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2024-01-01T00:00:00Z' as ISODateString
    }
];

const mockPayees: Array<IPayee> = [
    createMockPayee('p-1', 'Netflix'),
    createMockPayee('p-2', 'Trader Joe'),
    createMockPayee('p-3', 'Whole Foods Market')
];

const mockCategories: Array<ICategory> = [
    {
        id: 'cat-1',
        name: 'Entertainment',
        parentId: null,
        isActive: true,
        description: 'Streaming & Fun',
        createdAt: '2024-01-01' as ISODateString,
        updatedAt: '2024-01-01' as ISODateString
    }
];

const mockTransactions: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acc-1',
        payeeId: 'p-1',
        date: '2024-01-01' as ISODateString,
        payee: 'Netflix',
        memo: 'Streaming',
        totalAmount: -1599,
        status: TransactionStatus.Cleared,
        splits: [{ id: 's-1', amount: -1599, categoryId: 'cat-1', memo: '' }],
        checkNumber: '1001',
        importHash: 'hash-1',
        createdAt: '2024-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2024-01-01T00:00:00Z' as ISODateString
    }
];

const mockApplyBatch = fn();
const mockRecordTransfer = fn();
const mockGetOrCreatePayee = fn(async (name: string) => createMockPayee(`p-${Date.now()}`, name));
const mockCreateCategory = fn(async (name: string, parentId: string | null) => ({
    id: `cat-${Date.now()}`,
    name,
    parentId,
    isActive: true,
    description: '',
    createdAt: '2024-01-01' as ISODateString,
    updatedAt: '2024-01-01' as ISODateString
}));
const mockUpdateTx = fn();

const mockLedgerStore = {
    accounts: signal<Array<IAccount>>(mockAccounts),
    payees: signal<Array<IPayee>>(mockPayees),
    categories: signal<Array<ICategory>>(mockCategories),
    transactions: signal<Array<ITransaction>>(mockTransactions),
    applyReconciliationBatch: mockApplyBatch,
    recordTransfer: mockRecordTransfer,
    getOrCreatePayee: mockGetOrCreatePayee,
    createCategory: mockCreateCategory,
    updateTransaction: mockUpdateTx
};

const meta: Meta<TransactionEntryFormComponent> = {
    title: 'Ledger/TransactionEntryForm',
    component: TransactionEntryFormComponent,
    decorators: [
        applicationConfig({
            providers: [
                provideNoopAnimations(),
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        })
    ],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    args: {
        accountId: 'acc-1'
    }
};

export default meta;
type Story = StoryObj<TransactionEntryFormComponent>;

export const Default: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Type and select payee', async () => {
            const payeeInput = canvas.getByRole('combobox', { name: /payee/i });
            await userEvent.type(payeeInput, 'Netflix');
            const netflixOption = await canvas.findByText('Netflix');
            await userEvent.click(netflixOption);
        });

        await step('Type transaction amount', async () => {
            const amountInput = canvasElement.querySelector('#amount-input') as HTMLInputElement;
            await userEvent.type(amountInput, '25.50');
            await userEvent.tab();
        });

        await step('Save transaction', async () => {
            const submitBtn = canvas.getByRole('button', { name: /^Enter$/i });
            await expect(submitBtn).toBeEnabled();
            await userEvent.click(submitBtn);
            await expect(submitBtn).toBeDisabled();
        });
    }
};

export const DepositMode: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const depositBtn = canvas.getByRole('button', { name: /^Deposit$/i });
        await userEvent.click(depositBtn);
        await expect(canvas.getByText(/Rcvd From/i)).toBeInTheDocument();
    }
};

export const TransferMode: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const transferBtn = canvas.getByRole('button', { name: /^Transfer$/i });
        await userEvent.click(transferBtn);
        await expect(canvas.getByLabelText(/Transfer To/i)).toBeInTheDocument();
    }
};
