import { signal } from '@angular/core';
import type { ITransaction } from '@core';
import { TransactionStatus } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { TransactionTableComponent } from './transaction-table.component';

const now = new Date();
const toDateStr = (offsetDays: number = 0): string => {
    const d = new Date(now.getTime() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
};

const mockTransactions: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acc-1',
        date: toDateStr(-2),
        payee: "Trader Joe's",
        payeeId: 'p-1',
        memo: 'Groceries and snacks',
        totalAmount: -8450,
        status: TransactionStatus.Cleared,
        splits: [
            {
                id: 'sp-1',
                categoryId: 'cat-groceries',
                amount: -8450,
                memo: 'Groceries'
            }
        ],
        checkNumber: null,
        importHash: 'h1',
        createdAt: '2026-09-10T12:00:00Z',
        updatedAt: '2026-09-10T12:00:00Z'
    },
    {
        id: 'tx-2',
        accountId: 'acc-1',
        date: toDateStr(-1),
        payee: 'Acme Corp Payroll',
        payeeId: 'p-2',
        memo: 'Salary deposit',
        totalAmount: 320000,
        status: TransactionStatus.Cleared,
        splits: [
            {
                id: 'sp-2',
                categoryId: 'cat-salary',
                amount: 320000,
                memo: 'Salary'
            }
        ],
        checkNumber: null,
        importHash: 'h2',
        createdAt: '2026-09-11T08:00:00Z',
        updatedAt: '2026-09-11T08:00:00Z'
    },
    {
        id: 'tx-3',
        accountId: 'acc-1',
        date: toDateStr(1),
        payee: 'Blue Bottle Coffee',
        payeeId: 'p-3',
        memo: 'Coffee beans',
        totalAmount: -2200,
        status: TransactionStatus.Pending,
        splits: [
            {
                id: 'sp-3',
                categoryId: 'cat-dining',
                amount: -2200,
                memo: 'Coffee beans'
            }
        ],
        checkNumber: null,
        importHash: 'h3',
        createdAt: '2026-09-13T09:00:00Z',
        updatedAt: '2026-09-13T09:00:00Z'
    }
];

const mockLedgerStore = {
    categories: signal<Array<{ id: string; name: string }>>([
        { id: 'cat-groceries', name: 'Groceries' },
        { id: 'cat-salary', name: 'Salary' },
        { id: 'cat-dining', name: 'Dining Out' }
    ]),
    updateTransaction: async (): Promise<void> => {}
};

const meta: Meta<TransactionTableComponent> = {
    title: 'Ledger/TransactionTableComponent',
    component: TransactionTableComponent,
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<TransactionTableComponent>;

export const Default: Story = {
    args: {
        data: mockTransactions,
        isLoading: false
    },
    play: async ({ canvasElement }): Promise<void> => {
        const canvas = within(canvasElement);
        const filterInput = canvas.getByPlaceholderText(/Filter transactions/i);
        await expect(filterInput).toBeInTheDocument();

        const showingText = canvas.getByText(/Showing 3 records/i);
        await expect(showingText).toBeInTheDocument();

        const payees = canvas.getAllByText(/Trader Joe's/i);
        await expect(payees.length).toBeGreaterThan(0);
    }
};

export const Filtered: Story = {
    args: {
        data: mockTransactions,
        isLoading: false
    },
    play: async ({ canvasElement }): Promise<void> => {
        const canvas = within(canvasElement);
        const filterInput = canvas.getByPlaceholderText(/Filter transactions/i);
        await expect(filterInput).toBeInTheDocument();

        await userEvent.type(filterInput, 'Trader');

        const filteredPayees = canvas.getAllByText(/Trader Joe's/i);
        await expect(filteredPayees.length).toBeGreaterThan(0);

        await expect(canvas.queryByText(/Acme Corp Payroll/i)).toBeNull();
    }
};
