import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { Router } from '@angular/router';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { NewAccountDialogComponent } from './new-account-dialog.component';
import {
    mockImportProgress,
    mockImportService,
    mockImportStats,
    mockPostHogService,
    mockRouter,
    mockSettingsStore,
    storyTracker
} from './new-account-dialog.mock';

const meta: Meta<NewAccountDialogComponent> = {
    title: 'Onboarding/NewAccountDialogComponent',
    component: NewAccountDialogComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [
                { provide: UserSettingsStore, useValue: mockSettingsStore },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: Router, useValue: mockRouter }
            ]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<NewAccountDialogComponent>;

export const Open: Story = {
    args: {
        isOpen: true
    }
};

export const Closed: Story = {
    args: {
        isOpen: false
    }
};

export const InteractiveStandardAccountFlow: Story = {
    args: {
        isOpen: true
    },
    play: async ({ canvasElement }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const body = within(canvasElement.ownerDocument.body);

        // Select Checking
        const checkingBtn = await body.findByText(/Checking/i);
        await userEvent.click(checkingBtn);

        // Now we should be on the details step
        await expect(await body.findByText(/Daily spending & income/i)).toBeInTheDocument();

        // Fill details (Account Name is auto-filled to 'Main Checking')
        await userEvent.type(await body.findByLabelText(/starting balance/i), '1500');

        // Click Create Only
        const createBtn = await body.findByRole('button', { name: /create only/i });
        await expect(createBtn).not.toBeDisabled();
    }
};

export const InteractiveCreateAndImportFlow: Story = {
    args: {
        isOpen: true
    },
    play: async ({ canvasElement }) => {
        mockImportService.reset();
        storyTracker.commitImportCalled = false;
        storyTracker.lastStartImportOptions = null;

        await new Promise(resolve => setTimeout(resolve, 500));
        const body = within(canvasElement.ownerDocument.body);

        // 1. Select Checking
        const checkingBtn = await body.findByText(/Checking/i);
        await userEvent.click(checkingBtn);

        // 2. Click "Create & Import"
        const createAndImportBtn = await body.findByRole('button', {
            name: /create & import/i
        });
        await expect(createAndImportBtn).toBeEnabled();
        await userEvent.click(createAndImportBtn);

        // 3. Verify step 3 (import-data) with drop zone
        await expect(
            await body.findByText(/Drag & Drop QIF File|Drop to Import/i)
        ).toBeInTheDocument();
        const browseBtn = await body.findByText(/Browse Files/i);
        await expect(browseBtn).toBeInTheDocument();

        // 4. Simulate file upload
        const testFile = new File(
            ['!Type:Bank\nD01/01/2026\nT-50.00\nPOffice\n^\n'],
            'sample.qif',
            {
                type: 'text/plain'
            }
        );
        const fileInput = canvasElement.ownerDocument.body.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        expect(fileInput).not.toBeNull();
        await userEvent.upload(fileInput, testFile);
        if (!storyTracker.lastStartImportOptions) {
            Object.defineProperty(fileInput, 'files', {
                value: [testFile],
                writable: true
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 5. Verify deferCategoryMapping was passed as true to prevent deadlock
        const lastOptions = storyTracker.lastStartImportOptions as {
            deferCategoryMapping?: boolean;
        } | null;
        expect(lastOptions?.deferCategoryMapping).toBe(true);

        // 6. Verify "Import Ready!" state rendered smoothly without snapping back
        await expect(await body.findByText(/Import Ready!/i)).toBeInTheDocument();
        await expect(
            await body.findByText(/5 transactions parsed and ready to review/i)
        ).toBeInTheDocument();

        // 7. Verify NO secondary category mapping dialog exists in DOM
        const dialogs = canvasElement.ownerDocument.querySelectorAll('.p-dialog');
        expect(dialogs.length).toBe(1);
        expect(body.queryByText(/Map Categories/i)).toBeNull();

        // 8. Click "Go to Ledger" and verify commitImport is triggered
        const goToLedgerBtn = await body.findByRole('button', { name: /go to ledger/i });
        await expect(goToLedgerBtn).toBeInTheDocument();
        await userEvent.click(goToLedgerBtn);
        expect(storyTracker.commitImportCalled).toBe(true);
    }
};

export const ImportInProgress: Story = {
    args: {
        isOpen: true
    },
    play: async ({ canvasElement }) => {
        mockImportService.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        const checkingBtn = await body.findByText(/Checking/i);
        await userEvent.click(checkingBtn);
        const createAndImportBtn = await body.findByRole('button', {
            name: /create & import/i
        });
        await userEvent.click(createAndImportBtn);

        // Simulate active parsing state at 60%
        mockImportProgress.set({
            stage: 'parsing',
            pct: 60,
            processed: 600,
            total: 1000,
            tier: 'medium'
        });

        await expect(await body.findByText(/Parsing/i)).toBeInTheDocument();
        await expect(await body.findByText(/600 \/ 1,000 transactions/i)).toBeInTheDocument();
    }
};

export const ImportReady: Story = {
    args: {
        isOpen: true
    },
    play: async ({ canvasElement }) => {
        mockImportService.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        const checkingBtn = await body.findByText(/Checking/i);
        await userEvent.click(checkingBtn);
        const createAndImportBtn = await body.findByRole('button', {
            name: /create & import/i
        });
        await userEvent.click(createAndImportBtn);

        // Simulate completed state
        mockImportStats.set({
            totalCount: 7912,
            newCount: 7912,
            fuzzyCount: 0,
            exactCount: 0
        });
        mockImportProgress.set({
            stage: 'done',
            pct: 100,
            processed: 7912,
            total: 7912,
            tier: 'large'
        });

        await expect(await body.findByText(/Import Ready!/i)).toBeInTheDocument();
        await expect(
            await body.findByText(/7,912 transactions parsed and ready to review/i)
        ).toBeInTheDocument();
        await expect(
            await body.findByRole('button', { name: /go to ledger/i })
        ).toBeInTheDocument();
    }
};
