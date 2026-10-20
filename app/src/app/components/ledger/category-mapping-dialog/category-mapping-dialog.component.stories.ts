import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { CategoryMappingDialogComponent } from './category-mapping-dialog.component';

const createMockImportService = (
    unknowns: Array<string> = ['Payee: Trader Joe', 'Fast Food: Burger King']
) => ({
    unknownCategories: signal(unknowns),
    resolveUnknownCategories: async () => {},
    resolveWithBackgroundCategorization: async () => {},
    cancel: () => {},
    reset: () => {}
});

const mockLedgerStore = {
    categories: signal([
        { id: 'cat-groceries', name: 'Groceries', parentId: null },
        { id: 'cat-restaurants', name: 'Restaurants', parentId: null }
    ]),
    payees: signal([]),
    transactions: signal([]),
    createCategory: async () => ({ id: 'cat-new', name: 'New' }),
    bulkUpsertPayeesAndAliases: async () => {}
};

const mockGeminiService = {
    hasKey: () => true,
    apiKey: () => 'test-key',
    generateContent: async () => JSON.stringify({ mappings: [] })
};

const mockAiService = {
    startBackgroundCategorization: () => {},
    status: signal('idle')
};

const meta: Meta<CategoryMappingDialogComponent> = {
    title: 'Ledger/CategoryMappingDialog',
    component: CategoryMappingDialogComponent,
    decorators: [
        moduleMetadata({
            imports: []
        }),
        applicationConfig({
            providers: [
                { provide: ImportOrchestrationService, useValue: createMockImportService() },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAutoCategorizeService, useValue: mockAiService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<CategoryMappingDialogComponent>;

export const DefaultWithUnknowns: Story = {
    play: async ({ canvasElement }) => {
        // Look inside the document body because PrimeNG appends dialog to body
        const dialogEl = document.querySelector('.p-dialog') || canvasElement;
        const body = within(dialogEl as HTMLElement);

        await expect(body.getByText(/Unknown Categories & Payees Detected/i)).toBeInTheDocument();
        await expect(body.getByText(/Trader Joe/i)).toBeInTheDocument();
        await expect(body.getByRole('button', { name: /AI Auto-Map/i })).toBeInTheDocument();
        await expect(
            body.getByRole('button', { name: /Run in Background & Open Ledger/i })
        ).toBeInTheDocument();
    }
};

export const ClickBackgroundCategorize: Story = {
    play: async ({ canvasElement }) => {
        const dialogEl = document.querySelector('.p-dialog') || canvasElement;
        const body = within(dialogEl as HTMLElement);

        const bgBtn = body.getByRole('button', { name: /Run in Background & Open Ledger/i });
        await expect(bgBtn).toBeInTheDocument();
        await userEvent.click(bgBtn);
    }
};

export const AiNotConfigured: Story = {
    play: async ({ canvasElement }) => {
        const dialogEl = document.querySelector('.p-dialog') || canvasElement;
        const body = within(dialogEl as HTMLElement);

        await expect(body.getByText(/Automatic AI Category Discovery/i)).toBeInTheDocument();
        await expect(
            body.getByRole('button', { name: /Configure in Settings/i })
        ).toBeInTheDocument();
        await expect(
            body.queryByRole('button', { name: /Run in Background & Open Ledger/i })
        ).toBeNull();
    }
};
