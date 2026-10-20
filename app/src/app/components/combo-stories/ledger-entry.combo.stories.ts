import { CommonModule } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../services/ledger-store/ledger.store';
import {
    createMockLedgerStore,
    provideStoryFixtures,
    StoryPreset
} from '../../testing/story-fixtures';
import { TransactionEntryFormComponent } from '../ledger/transaction-entry-form/transaction-entry-form.component';
import { TransactionTableComponent } from '../ledger/transaction-table/transaction-table.component';

/**
 * Combo composition component pairing TransactionEntryForm with TransactionTable.
 * When transactions are added or updated in the form, the table reactively renders changes.
 */
@Component({
    selector: 'combo-ledger-entry',
    standalone: true,
    imports: [CommonModule, TransactionEntryFormComponent, TransactionTableComponent],
    template: `
        <div class="h-screen bg-black/95 text-white flex flex-col p-6 gap-6 font-sans">
            <header class="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h1 class="text-xl font-bold tracking-tight">Ledger Operations Simulator</h1>
                    <p class="text-white/60 text-sm">
                        Interactive verification of quick-entry, split transactions, and table
                        updates.
                    </p>
                </div>
                <div class="text-xs text-white/50">
                    Total Transactions:
                    <span data-testid="tx-count" class="font-mono text-primary font-bold">
                        {{ ledgerStore.transactions().length }}
                    </span>
                </div>
            </header>

            <div class="border border-white/10 rounded-xl p-4 bg-white/5">
                <h2 class="text-sm font-semibold text-white/80 mb-3">Record Transaction</h2>
                <transaction-entry-form
                    #entryForm
                    [accountId]="selectedAccountId()"
                ></transaction-entry-form>
            </div>

            <div
                class="flex-1 min-h-0 border border-white/10 rounded-xl overflow-hidden bg-black/50"
            >
                <transaction-table
                    [data]="ledgerStore.transactions()"
                    (editClicked)="entryForm.editTransaction($event)"
                ></transaction-table>
            </div>
        </div>
    `
})
export class ComboLedgerEntryComponent {
    readonly ledgerStore = inject(LedgerStore);
    readonly selectedAccountId = signal<string>('acc-checking-01');
    readonly entryForm = viewChild<TransactionEntryFormComponent>('entryForm');
}

export const sharedMockLedgerStore = createMockLedgerStore(StoryPreset.ActiveLedger);

const meta: Meta<ComboLedgerEntryComponent> = {
    title: 'Combo Compositions/6. Ledger Operations',
    component: ComboLedgerEntryComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: provideStoryFixtures({ customLedger: sharedMockLedgerStore })
        })
    ]
};

export default meta;
type Story = StoryObj<ComboLedgerEntryComponent>;

export const DefaultLedger: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        // Verify baseline transactions rendered
        const txCountElem = await body.findByTestId('tx-count');
        expect(txCountElem.textContent?.trim()).toBe('4');
        expect(await body.findByText(/Highland Properties/i)).toBeInTheDocument();
        expect(await body.findByText(/Acme Corp Payroll/i)).toBeInTheDocument();
    }
};

export const InteractiveCreateTransactionFlow: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        const initialCount = sharedMockLedgerStore.transactions().length;

        // 1. Enter Payee and select from suggestion dropdown
        const payeeInput = await body.findByLabelText(/pay to/i);
        await userEvent.clear(payeeInput);
        await userEvent.type(payeeInput, 'Target Superstore');
        const suggestion = await body.findByText(/Add 'Target Superstore'/i);
        await userEvent.click(suggestion);

        // 2. Enter Amount
        const amountInput = await body.findByLabelText(/amount/i);
        await userEvent.clear(amountInput);
        await userEvent.type(amountInput, '85.50');

        // 3. Enter Memo
        const memoInput = await body.findByLabelText(/memo/i);
        await userEvent.type(memoInput, 'Household essentials');

        // 4. Submit Form
        const submitBtn = await body.findByRole('button', { name: /enter/i });
        await expect(submitBtn).toBeEnabled();
        await userEvent.click(submitBtn);

        // 5. Assert Table reflects new transaction
        await new Promise(resolve => setTimeout(resolve, 300));
        expect(sharedMockLedgerStore.transactions().length).toBe(initialCount + 1);
        expect(await body.findByText(/Target Superstore/i)).toBeInTheDocument();
    }
};

export const InteractiveEditTransactionFlow: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        // 1. Locate existing transaction
        const existingTx = sharedMockLedgerStore
            .transactions()
            .find(t => t.payee === 'Blue Bottle Coffee');
        expect(existingTx).toBeDefined();

        // 2. Trigger edit on transaction via table click and double click
        const coffeeRow = await body.findByText(/Blue Bottle Coffee/i);
        await userEvent.click(coffeeRow);
        await userEvent.dblClick(coffeeRow);
        coffeeRow.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

        // 3. Form is now in edit mode; modify memo
        const memoInput = await body.findByLabelText(/memo/i);
        await userEvent.clear(memoInput);
        await userEvent.type(memoInput, 'Updated Afternoon Coffee Memo');

        // 4. Save updated transaction
        const enterBtn = await body.findByRole('button', { name: /enter/i });
        await userEvent.click(enterBtn);

        // 5. Verify update in table and mock store
        await new Promise(resolve => setTimeout(resolve, 300));
        const updatedTx = sharedMockLedgerStore.transactions().find(t => t.id === existingTx?.id);
        expect(updatedTx?.memo).toBe('Updated Afternoon Coffee Memo');
        expect(await body.findByText(/Updated Afternoon Coffee Memo/i)).toBeInTheDocument();
    }
};

export const InteractiveSplitTransactionFlow: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        // 1. Enter Payee and select suggestion
        const payeeInput = await body.findByLabelText(/pay to/i);
        await userEvent.clear(payeeInput);
        await userEvent.type(payeeInput, 'Costco Wholesale');
        const suggestion = await body.findByText(/Add 'Costco Wholesale'/i);
        await userEvent.click(suggestion);

        // 2. Enter Amount and blur to commit value
        const amountInput = await body.findByLabelText(/amount/i);
        await userEvent.clear(amountInput);
        await userEvent.type(amountInput, '150.00');
        await userEvent.tab();

        // 3. Click Split button by title
        const splitBtn = (await body.findByTitle(/edit splits/i)) as HTMLElement;
        await userEvent.click(splitBtn);
        splitBtn.click();

        // 4. Verify Split Entry Dialog is displayed
        const dialog = await body.findByRole('dialog');
        await expect(dialog).toBeInTheDocument();

        // 5. Save splits from dialog using Done button
        const doneBtn = dialog.querySelector(
            'button[aria-label="Confirm splits"]'
        ) as HTMLButtonElement;
        expect(doneBtn).not.toBeNull();
        await userEvent.click(doneBtn);
        doneBtn.click();

        // 6. Submit form
        const enterBtn = await body.findByRole('button', { name: /enter/i });
        await userEvent.click(enterBtn);

        // 7. Verify table reflects split transaction
        await new Promise(resolve => setTimeout(resolve, 300));
        expect(await body.findByText(/Costco Wholesale/i)).toBeInTheDocument();
    }
};
