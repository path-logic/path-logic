import { signal } from '@angular/core';
import type { ITransaction } from '@core';
import { TransactionStatus } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ReconciliationDialogComponent } from './reconciliation-dialog.component';

const MOCK_TRANSACTIONS: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acc-1',
        date: '2024-03-01T00:00:00Z',
        payeeId: 'p1',
        totalAmount: -4500, // -$45.00
        status: TransactionStatus.Pending,
        splits: [],
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z'
    },
    {
        id: 'tx-2',
        accountId: 'acc-1',
        date: '2024-03-02T00:00:00Z',
        payeeId: 'p2',
        totalAmount: 150000, // +$1500.00
        status: TransactionStatus.Pending,
        splits: [],
        createdAt: '2024-03-02T00:00:00Z',
        updatedAt: '2024-03-02T00:00:00Z'
    }
] as any;

const mockLedgerStore = {
    transactions: signal(MOCK_TRANSACTIONS),
    categories: signal([
        {
            id: 'cat-1',
            name: 'Groceries',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        },
        {
            id: 'cat-2',
            name: 'Salary',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }
    ] as any),
    addTransactions: async () => {},
    updateTransactions: async () => {}
};

const meta: Meta<ReconciliationDialogComponent> = {
    title: 'Ledger/ReconciliationDialogComponent',
    component: ReconciliationDialogComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        isOpen: true,
        matches: []
    }
};

export default meta;
type Story = StoryObj<ReconciliationDialogComponent>;

export const OpenWithMatches: Story = {
    args: {
        isOpen: true,
        matches: [
            // Exact match for tx-1
            {
                type: 'exact',
                parsedTx: {
                    date: '2024-03-01',
                    amount: -4500,
                    payee: 'Chevron'
                },
                confidence: 1,
                existingTxId: 'tx-1'
            },
            // New transaction
            {
                type: 'none',
                parsedTx: {
                    date: '2024-03-05',
                    amount: -1200,
                    payee: 'Netflix'
                },
                confidence: 0
            }
        ] as any
    }
};

export const OpenEmpty: Story = {
    args: {
        isOpen: true,
        matches: []
    }
};

export const InteractiveReconciliation: Story = {
    args: {
        isOpen: true,
        matches: [
            {
                type: 'fuzzy',
                parsedTx: {
                    date: '2024-03-01',
                    amount: -4500,
                    payee: 'Chevron'
                },
                confidence: 0.8,
                existingTxId: 'tx-1'
            }
        ] as any
    },
    play: async ({ canvasElement }) => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Allow computed signals to run
        const body = within(canvasElement.ownerDocument.body);

        // Initial match should be selected by default
        const matchBtn = body.getByRole('button', { name: /^match$/i });
        await expect(matchBtn).toHaveAttribute('aria-pressed', 'true');

        // Click Add as Separate (Import)
        const addBtn = body.getByRole('button', { name: /^import$/i });
        await userEvent.click(addBtn);

        // Verify it now has active state
        await expect(addBtn).toHaveAttribute('aria-pressed', 'true');
        await expect(matchBtn).not.toHaveAttribute('aria-pressed', 'true');

        // Verify submit button is enabled
        const submitBtn = body.getByRole('button', { name: /commit all decisions/i });
        await expect(submitBtn).not.toBeDisabled();
    }
};
