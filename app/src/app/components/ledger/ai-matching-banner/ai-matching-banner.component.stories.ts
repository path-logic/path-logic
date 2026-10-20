import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AiMatchingBannerComponent } from './ai-matching-banner.component';

const createMockAiService = (initialState: {
    status: 'idle' | 'running' | 'completed' | 'error';
    pct?: number;
    processed?: number;
    total?: number;
    message?: string;
    suggestions?: Array<any>;
    error?: { message: string; isQuota: boolean } | null;
}) => ({
    status: signal(initialState.status),
    progress: signal({
        pct: initialState.pct ?? 0,
        processed: initialState.processed ?? 0,
        total: initialState.total ?? 0,
        message: initialState.message ?? ''
    }),
    suggestions: signal(initialState.suggestions ?? []),
    error: signal(initialState.error ?? null),
    targetTransactions: signal([]),
    cancel: () => {},
    dismiss: () => {},
    acceptAll: async () => initialState.suggestions?.length ?? 0
});

const mockLedgerStore = {
    categories: signal([
        { id: 'cat-groceries', name: 'Groceries' },
        { id: 'cat-coffee', name: 'Coffee Shops' }
    ])
};

const meta: Meta<AiMatchingBannerComponent> = {
    title: 'Ledger/AiMatchingBanner',
    component: AiMatchingBannerComponent,
    decorators: [
        moduleMetadata({
            imports: []
        }),
        applicationConfig({
            providers: [
                {
                    provide: AiAutoCategorizeService,
                    useValue: createMockAiService({
                        status: 'running',
                        pct: 45,
                        processed: 18,
                        total: 40,
                        message: 'Analyzing merchants...'
                    })
                },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<AiMatchingBannerComponent>;

export const RunningState: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/AI Auto-Categorizing/i)).toBeInTheDocument();
        await expect(canvas.getByText(/45%/i)).toBeInTheDocument();
        await expect(canvas.getByText(/18 of 40 processed/i)).toBeInTheDocument();
        const cancelBtn = canvas.getByRole('button', { name: /Cancel/i });
        await expect(cancelBtn).toBeInTheDocument();
    }
};

export const CompletedState: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: AiAutoCategorizeService,
                    useValue: createMockAiService({
                        status: 'completed',
                        suggestions: [
                            {
                                unknownCategory: 'Payee: Trader Joe',
                                matchedCategoryId: 'cat-groceries',
                                confidence: 'high',
                                source: 'heuristic'
                            },
                            {
                                unknownCategory: 'Payee: Peets Coffee',
                                matchedCategoryId: 'cat-coffee',
                                confidence: 'high',
                                source: 'ai'
                            }
                        ]
                    })
                },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/AI Auto-Categorization Complete/i)).toBeInTheDocument();
        await expect(canvas.getByText(/2 categorized/i)).toBeInTheDocument();

        const reviewBtn = canvas.getByRole('button', { name: /Review/i });
        const acceptBtn = canvas.getByRole('button', { name: /Accept All/i });
        await expect(reviewBtn).toBeInTheDocument();
        await expect(acceptBtn).toBeInTheDocument();

        // Click review button to open modal dialog
        await userEvent.click(reviewBtn);
    }
};

export const ErrorState: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: AiAutoCategorizeService,
                    useValue: createMockAiService({
                        status: 'error',
                        error: {
                            message: 'Rate limit exceeded: 429 Resource Exhausted',
                            isQuota: true
                        }
                    })
                },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
        const dismissBtn = canvas.getByRole('button', { name: /Dismiss/i });
        await expect(dismissBtn).toBeInTheDocument();
    }
};
