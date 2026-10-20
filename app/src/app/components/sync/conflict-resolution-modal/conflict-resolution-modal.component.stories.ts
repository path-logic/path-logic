import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { ITransactionConflict } from '../../../lib/sync/MergeEngine';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ConflictResolutionModalComponent } from './conflict-resolution-modal.component';

const sampleConflicts: Array<ITransactionConflict> = [
    {
        id: 'conflict-1',
        mine: {
            date: '2026-03-01',
            payee: 'Coffee Shop Local',
            totalAmount: -450,
            memo: 'Morning coffee',
            status: 'cleared',
            checkNumber: null,
            accountId: 'acc-1',
            payeeId: 'p-1',
            importHash: null,
            updatedAt: '2026-03-01T14:30:00.000Z'
        },
        theirs: {
            date: '2026-03-01',
            payee: 'Coffee Shop Remote',
            totalAmount: -500,
            memo: 'Remote update',
            status: 'reconciled',
            checkNumber: null,
            accountId: 'acc-1',
            payeeId: 'p-1',
            importHash: null,
            updatedAt: '2026-03-01T15:00:00.000Z'
        }
    },
    {
        id: 'conflict-2',
        mine: {
            date: '2026-03-02',
            payee: 'Grocery Market',
            totalAmount: -12500,
            memo: 'Weekly supplies',
            status: 'cleared',
            checkNumber: null,
            accountId: 'acc-1',
            payeeId: 'p-2',
            importHash: null,
            updatedAt: '2026-03-02T10:00:00.000Z'
        },
        theirs: {
            date: '2026-03-02',
            payee: 'Grocery Market',
            totalAmount: -13000,
            memo: 'Weekly supplies with taxes',
            status: 'cleared',
            checkNumber: null,
            accountId: 'acc-1',
            payeeId: 'p-2',
            importHash: null,
            updatedAt: '2026-03-02T11:00:00.000Z'
        }
    }
];

export const resolveConflictMock = fn().mockResolvedValue(undefined);

export const mockLedgerStore = {
    syncConflicts: signal<Array<ITransactionConflict>>(sampleConflicts),
    resolveConflict: resolveConflictMock
};

const meta: Meta<ConflictResolutionModalComponent> = {
    title: 'Sync/ConflictResolutionModal',
    component: ConflictResolutionModalComponent,
    excludeStories: /.*Mock|mock.*/,
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
type Story = StoryObj<ConflictResolutionModalComponent>;

export const Default: Story = {
    render: () => ({
        template: `<conflict-resolution-modal />`
    })
};

export const InteractiveResolution: Story = {
    render: () => ({
        template: `<conflict-resolution-modal />`
    }),
    play: async ({ canvasElement }) => {
        resolveConflictMock.mockClear();
        const body = within(canvasElement.ownerDocument.body);

        await expect(body.getByText('Sync Conflicts Detected')).toBeInTheDocument();
        await expect(body.getByText('Coffee Shop Local')).toBeInTheDocument();

        const keepMineButtons = body.getAllByRole('button', { name: /keep mine/i });
        expect(keepMineButtons.length).toBeGreaterThan(0);
        await userEvent.click(keepMineButtons[0]!);

        expect(resolveConflictMock).toHaveBeenCalledWith('conflict-1', true);

        const keepTheirsButtons = body.getAllByRole('button', { name: /keep theirs/i });
        expect(keepTheirsButtons.length).toBeGreaterThan(0);
        await userEvent.click(keepTheirsButtons[0]!);

        expect(resolveConflictMock).toHaveBeenCalledWith('conflict-1', false);
    }
};

export const BulkResolution: Story = {
    render: () => ({
        template: `<conflict-resolution-modal />`
    }),
    play: async ({ canvasElement }) => {
        resolveConflictMock.mockClear();
        const body = within(canvasElement.ownerDocument.body);

        await expect(body.getByText('Sync Conflicts Detected')).toBeInTheDocument();

        const keepAllMineButton = body.getByRole('button', { name: /keep all mine/i });
        await userEvent.click(keepAllMineButton);

        expect(resolveConflictMock).toHaveBeenCalledWith('conflict-1', true);
        expect(resolveConflictMock).toHaveBeenCalledWith('conflict-2', true);
    }
};
