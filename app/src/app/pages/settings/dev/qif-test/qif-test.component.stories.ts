import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { QifTestComponent } from './qif-test.component';

const mockCategories = signal([
    { id: 'cat-1', name: 'Groceries' },
    { id: 'cat-2', name: 'Salary' }
]);

const mockLedgerStore = {
    categories: mockCategories,
    getCategoryAlias: (alias: string) => (alias.toLowerCase() === 'food' ? 'cat-1' : null)
};

const meta: Meta<QifTestComponent> = {
    title: 'Settings/Dev/QifTestComponent',
    component: QifTestComponent,
    tags: ['autodocs'],
    decorators: [
        moduleMetadata({
            imports: []
        }),
        applicationConfig({
            providers: [provideRouter([]), { provide: LedgerStore, useValue: mockLedgerStore }]
        })
    ]
};

export default meta;
type Story = StoryObj<QifTestComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Upload QIF File/i)).toBeInTheDocument();
        await expect(canvas.getByText(/No file selected yet/i)).toBeInTheDocument();
    }
};

export const WithDiagnosticsLoaded: Story = {
    play: async ({ canvasElement }) => {
        const sampleQif = `!Type:Bank
D1/15/2026
T-50.00
PAmazon
LGroceries
C*
^
D1/16/2026
T1000.00
PEmployer
LSalary
CX
^
D1/17/2026
T-25.00
PCoffee Shop
LFood
^`;

        const file = new File([sampleQif], 'checking_activity.qif', { type: 'application/x-qif' });
        const fileInput = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;

        if (fileInput) {
            const fileList = Object.assign([file], {
                item: (i: number) => fileList[i] ?? null
            });
            Object.defineProperty(fileInput, 'files', {
                value: fileList,
                configurable: true
            });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/Explicit Status Breakdown/i)).toBeInTheDocument();
        await expect(canvas.getAllByText(/Account Creation Import/i)[0]).toBeInTheDocument();
        await expect(canvas.getAllByText(/Ongoing Reconciliation Import/i)[0]).toBeInTheDocument();
    }
};
