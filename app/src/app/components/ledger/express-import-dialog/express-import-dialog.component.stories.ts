import type { IParsedTransaction, IReconciliationMatch } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { IImportStats } from '../../../services/import/import.types';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { ExpressImportDialogComponent } from './express-import-dialog.component';

function createParsedTx(overrides: Partial<IParsedTransaction> = {}): IParsedTransaction {
    return {
        date: '2024-03-01',
        amount: -4500,
        payee: 'Payee',
        memo: '',
        checkNumber: null,
        category: null,
        splits: [],
        importHash: 'hash-default',
        ...overrides
    };
}

const mockPosthogService = {
    posthog: {
        capture: fn()
    }
};

const mockMatches: Array<IReconciliationMatch> = [
    {
        type: 'none',
        parsedTx: createParsedTx({
            date: '2024-03-01',
            amount: -2500,
            payee: 'Amazon'
        }),
        confidence: 0
    },
    {
        type: 'none',
        parsedTx: createParsedTx({
            date: '2024-03-02',
            amount: -1500,
            payee: 'Spotify'
        }),
        confidence: 0
    },
    {
        type: 'exact',
        parsedTx: createParsedTx({
            date: '2024-03-03',
            amount: 50000,
            payee: 'Salary Employer'
        }),
        confidence: 1.0,
        existingTxId: 'tx-existing-1'
    }
];

const mockStats: IImportStats = {
    totalCount: 3,
    newCount: 2,
    fuzzyCount: 0,
    exactCount: 1
};

const meta: Meta<ExpressImportDialogComponent> = {
    title: 'Ledger/ExpressImportDialogComponent',
    component: ExpressImportDialogComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [{ provide: PostHogService, useValue: mockPosthogService }]
        })
    ],
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    args: {
        isOpen: true,
        matches: mockMatches,
        importStats: mockStats
    }
};

export default meta;
type Story = StoryObj<ExpressImportDialogComponent>;

export const OpenReady: Story = {
    args: {
        isOpen: true,
        matches: mockMatches,
        importStats: mockStats
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await new Promise(resolve => setTimeout(resolve, 100));

        await expect(body.getByText('Import Review')).toBeInTheDocument();
        await expect(body.getByText('Express Import Ready')).toBeInTheDocument();
        await expect(body.getByRole('button', { name: /express import/i })).not.toBeDisabled();
        await expect(body.getByRole('button', { name: /review first/i })).not.toBeDisabled();
    }
};

export const InteractiveExpressImport: Story = {
    args: {
        isOpen: true,
        matches: mockMatches,
        importStats: mockStats
    },
    play: async ({ canvasElement, step }) => {
        const body = within(canvasElement.ownerDocument.body);
        await new Promise(resolve => setTimeout(resolve, 200));

        const expressBtn = body.getByRole('button', { name: /express import/i });
        await expect(expressBtn).toBeInTheDocument();

        await step('Click Express Import button', async () => {
            await userEvent.click(expressBtn);
        });
    }
};

export const InteractiveReviewFirst: Story = {
    args: {
        isOpen: true,
        matches: mockMatches,
        importStats: mockStats
    },
    play: async ({ canvasElement, step }) => {
        const body = within(canvasElement.ownerDocument.body);
        await new Promise(resolve => setTimeout(resolve, 200));

        const reviewBtn = body.getByRole('button', { name: /review first/i });
        await expect(reviewBtn).toBeInTheDocument();

        await step('Click Review First button', async () => {
            await userEvent.click(reviewBtn);
        });
    }
};

export const InteractiveAbandon: Story = {
    args: {
        isOpen: true,
        matches: mockMatches,
        importStats: mockStats
    },
    play: async ({ canvasElement, step }) => {
        const body = within(canvasElement.ownerDocument.body);
        await new Promise(resolve => setTimeout(resolve, 200));

        const abandonBtn = body.getByRole('button', { name: /abandon import/i });
        await expect(abandonBtn).toBeInTheDocument();

        await step('Click Abandon Import button', async () => {
            await userEvent.click(abandonBtn);
        });
    }
};
