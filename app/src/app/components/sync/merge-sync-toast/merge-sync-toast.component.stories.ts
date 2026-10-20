import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import type { ITransactionConflict } from '../../../lib/sync/MergeEngine';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { MergeSyncToastComponent } from './merge-sync-toast.component';

const sampleConflicts: Array<ITransactionConflict> = [
    {
        id: 'c1',
        mine: {
            date: '2026-03-01',
            payee: 'Target Store',
            totalAmount: -3450,
            memo: 'Household items',
            status: 'cleared',
            checkNumber: null,
            accountId: 'acc-1',
            payeeId: 'p-1',
            importHash: null,
            updatedAt: '2026-03-01T12:00:00Z'
        },
        theirs: {
            date: '2026-03-01',
            payee: 'Target Store',
            totalAmount: -3800,
            memo: 'Household items with detergent',
            status: 'cleared',
            checkNumber: null,
            accountId: 'acc-1',
            payeeId: 'p-1',
            importHash: null,
            updatedAt: '2026-03-01T12:05:00Z'
        }
    }
];

const meta: Meta<MergeSyncToastComponent> = {
    title: 'Sync/MergeSyncToast',
    component: MergeSyncToastComponent,
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<MergeSyncToastComponent>;

export const SingleTransaction: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        mergeCount: signal(1),
                        syncConflicts: signal<Array<ITransactionConflict>>([])
                    }
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Ledger Synced')).toBeInTheDocument();
        await expect(
            canvas.getByText('1 new transaction synced from another device')
        ).toBeInTheDocument();
    }
};

export const MultipleWithConflicts: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        mergeCount: signal(4),
                        syncConflicts: signal<Array<ITransactionConflict>>(sampleConflicts)
                    }
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Ledger Synced')).toBeInTheDocument();
        await expect(
            canvas.getByText('4 transactions synced from another device')
        ).toBeInTheDocument();
        await expect(canvas.getByText(/1 conflict need your review/i)).toBeInTheDocument();
    }
};

export const InteractiveDismiss: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: {
                        mergeCount: signal(3),
                        syncConflicts: signal<Array<ITransactionConflict>>([])
                    }
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Ledger Synced')).toBeInTheDocument();

        const closeButton = canvas.getByRole('button', { name: /dismiss/i });
        await userEvent.click(closeButton);

        await expect(canvas.queryByText('Ledger Synced')).toBeNull();
    }
};
