import { signal } from '@angular/core';
import type { IPayee, IRecurringSchedule, ITransaction } from '@core';
import { TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeMergeDialogComponent } from './payee-merge-dialog.component';

const mockPayees = signal<Array<IPayee>>([
    {
        id: 'p-1',
        name: 'Starbucks #1234',
        address: null,
        city: 'Austin',
        state: 'TX',
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'p-2',
        name: 'Starbucks',
        address: null,
        city: 'Austin',
        state: 'TX',
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'p-3',
        name: 'Whole Foods Market',
        address: null,
        city: 'Austin',
        state: 'TX',
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    }
]);

const mockTransactions = signal<Array<ITransaction>>([
    {
        id: 'tx-1',
        accountId: 'acc-1',
        date: '2026-01-02',
        payee: 'Starbucks #1234',
        payeeId: 'p-1',
        memo: 'Morning Coffee',
        totalAmount: 550,
        status: TransactionStatus.Cleared,
        splits: [],
        checkNumber: null,
        importHash: 'h1',
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z'
    }
]);

const mockRecurringSchedules = signal<Array<IRecurringSchedule>>([]);

const mockLedgerStore = {
    payees: mockPayees,
    transactions: mockTransactions,
    recurringSchedules: mockRecurringSchedules,
    mergePayees: fn().mockResolvedValue({ affectedTransactions: 1, affectedSchedules: 0 })
};

const meta: Meta<PayeeMergeDialogComponent> = {
    title: 'Payees/PayeeMergeDialog',
    component: PayeeMergeDialogComponent,
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        })
    ],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<PayeeMergeDialogComponent>;

export const Default: Story = {
    args: {
        isOpen: true,
        initialSourcePayeeId: 'p-1'
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText('Merge Payees')).toBeInTheDocument();
        await expect(
            body.getByText('Payee to Merge (will be removed)', { exact: false })
        ).toBeInTheDocument();
        await expect(
            body.getByText('Keep this Payee (will receive all history)', { exact: false })
        ).toBeInTheDocument();

        // Select the primary target payee
        const targetSelect = body.getByLabelText(/Keep this Payee/i);
        await userEvent.selectOptions(targetSelect, 'p-2');

        // Confirm impact preview renders
        await expect(body.getByText('Merge Flow')).toBeInTheDocument();
        await expect(body.getByText(/1 Transaction/i)).toBeInTheDocument();
    }
};

export const DarkMode: Story = {
    args: {
        isOpen: true,
        initialSourcePayeeId: 'p-1'
    },
    parameters: {
        theme: 'dark'
    },
    render: args => ({
        props: args,
        template: `
            <div class="p-6 bg-surface-950 dark min-h-[400px]">
                <payee-merge-dialog [isOpen]="isOpen" [initialSourcePayeeId]="initialSourcePayeeId" />
            </div>
        `
    })
};
