import { signal } from '@angular/core';
import { type ICategory } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SplitEntryDialogComponent } from './split-entry-dialog.component';

/**
 * Mock LedgerStore to provide categories for the dropdowns.
 */
const mockLedgerStore = {
    categories: signal<Array<ICategory>>([
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
            name: 'Dining',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        },
        {
            id: 'cat-3',
            name: 'Salary',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
        }
    ] as any)
};

const meta: Meta<SplitEntryDialogComponent> = {
    title: 'Ledger/SplitEntryDialogComponent',
    component: SplitEntryDialogComponent,
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
type Story = StoryObj<SplitEntryDialogComponent>;

/**
 * Open with no initial splits.
 */
export const OpenUnbalanced: Story = {
    args: {
        isOpen: true,
        totalAmount: 15000, // $150.00
        initialSplits: []
    }
};

/**
 * Open with pre-existing splits perfectly balancing the total.
 */
export const OpenBalanced: Story = {
    args: {
        isOpen: true,
        totalAmount: 15000,
        initialSplits: [
            { id: 's1', amount: 10000, categoryId: 'cat-1', memo: 'Target Run' },
            { id: 's2', amount: 5000, categoryId: 'cat-2', memo: 'Starbucks inside Target' }
        ]
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        // Wait for signals to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify balance indicator shows 0 difference
        await expect(body.getByText(/\$0\.00/)).toBeInTheDocument();

        // Verify save button is enabled
        const saveBtn = body.getByRole('button', { name: /confirm splits/i });
        await expect(saveBtn).not.toBeDisabled();
    }
};

/**
 * Interactive test adding a split and balancing.
 */
export const InteractiveAddAndBalance: Story = {
    args: {
        isOpen: true,
        totalAmount: 20000,
        initialSplits: [{ id: 's1', amount: 10000, categoryId: 'cat-1', memo: 'Partial' }]
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Total 200, current split is 100. Diff is 100. Let's add another split.
        const addBtn = body.getByRole('button', { name: /add split/i });
        await userEvent.click(addBtn);

        // Click quick balance on the new split (it should appear after Add Split)
        const quickBalanceBtn = body.getByRole('button', {
            name: /quick balance/i
        });
        await userEvent.click(quickBalanceBtn);

        // Expect difference to be 0
        await expect(body.getByText(/\$0\.00/)).toBeInTheDocument();
    }
};
