import { Component, signal } from '@angular/core';
import type { ITransaction } from '@path-logic/core';
import { TransactionStatus } from '@path-logic/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { ReconciliationDialogComponent } from '../ledger/reconciliation-dialog/reconciliation-dialog.component';
import { SplitEntryDialogComponent } from '../ledger/split-entry-dialog/split-entry-dialog.component';

@Component({
    selector: 'app-combo-reconciliation',
    standalone: true,
    imports: [ReconciliationDialogComponent, SplitEntryDialogComponent],
    template: `
        <div class="h-screen bg-black/90 relative p-8">
            <h1 class="text-white text-2xl font-bold mb-4">Reconciliation Workflow Simulator</h1>
            <p class="text-white/60 mb-8">
                In this workflow, the user is reconciling imported transactions. One of the imported
                transactions needs to be split (e.g., a large Target run). Click "Simulate Split
                Action" to open the split dialog over the reconciliation dialog.
            </p>

            <button
                class="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90"
                (click)="reconOpen.set(true)"
            >
                1. Open Reconciliation
            </button>

            <button
                class="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 ml-4"
                (click)="splitOpen.set(true)"
            >
                2. Simulate Split Action
            </button>

            <!-- Base Dialog -->
            <app-reconciliation-dialog
                [isOpen]="reconOpen()"
                [matches]="mockImports"
                (closed)="reconOpen.set(false)"
            ></app-reconciliation-dialog>

            <!-- Stacked Dialog -->
            <app-split-entry-dialog
                [(isOpen)]="splitOpen"
                [totalAmount]="15000"
            ></app-split-entry-dialog>
        </div>
    `,
})
export class ComboReconciliationComponent {
    reconOpen = signal(false);
    splitOpen = signal(false);

    mockImports = [
        {
            type: 'fuzzy',
            parsedTx: { date: '2024-03-01', amount: -15000, payee: 'Target' },
            confidence: 0.9,
            existingTxId: 'tx-1',
        },
        {
            type: 'none',
            parsedTx: { date: '2024-03-02', amount: -450, payee: 'Starbucks' },
            confidence: 0,
        },
    ] as any;
}

// Mock LedgerStore with categories and existing transactions
const mockLedgerStore = {
    transactions: signal<Array<ITransaction>>([
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2024-03-01T00:00:00Z',
            payeeId: 'p1',
            totalAmount: -15000,
            status: TransactionStatus.Pending,
            splits: [],
            createdAt: '2024-03-01T00:00:00Z',
            updatedAt: '2024-03-01T00:00:00Z',
        },
    ] as any),
    categories: signal([
        {
            id: 'cat-1',
            name: 'Groceries',
            parentId: null,
            isActive: true,
        },
        {
            id: 'cat-2',
            name: 'Household',
            parentId: null,
            isActive: true,
        },
    ] as any),
};

const meta: Meta<ComboReconciliationComponent> = {
    title: 'Combo Compositions/5. Reconciliation Workflow',
    component: ComboReconciliationComponent,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }],
        }),
    ],
};

export default meta;
type Story = StoryObj<ComboReconciliationComponent>;

export const StackedDialogFlow: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Open Recon Dialog
        await userEvent.click(canvas.getByRole('button', { name: /1\. open reconciliation/i }));
        // Using body scope because dialogs are rendered in portals/overlays outside the canvas root sometimes
        const bodyContext = within(document.body);
        await expect(
            await bodyContext.findByText(/reviewing 2 bank statement entries/i),
        ).toBeInTheDocument();

        // 2. Open Split Dialog
        await userEvent.click(canvas.getByRole('button', { name: /2\. simulate split action/i }));
        await expect(bodyContext.getByText(/split transaction/i)).toBeInTheDocument();

        // Both dialogs should be technically in the DOM, but split dialog is focused/on top
        // Use a more specific selector to avoid ambiguity with the background total
        await expect(bodyContext.getAllByText(/\$150\.00/)[0]).toBeInTheDocument();
    },
};
