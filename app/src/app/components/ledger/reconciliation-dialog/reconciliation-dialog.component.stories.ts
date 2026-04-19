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
        const canvas = within(canvasElement);
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow computed signals to run

        // Initial match should be selected by default (bg-primary class)
        const matchBtn = canvas.getByRole('button', { name: /confirm match/i });
        await expect(matchBtn).toHaveClass('bg-primary');

        // Click Add as Separate
        const addBtn = canvas.getByRole('button', { name: /add as separate/i });
        await userEvent.click(addBtn);

        // Verify it now has bg-primary
        await expect(addBtn).toHaveClass('bg-primary');
        await expect(matchBtn).not.toHaveClass('bg-primary');

        // Verify submit button is enabled
        const submitBtn = canvas.getByRole('button', { name: /commit all decisions/i });
        await expect(submitBtn).not.toBeDisabled();
    }
};
