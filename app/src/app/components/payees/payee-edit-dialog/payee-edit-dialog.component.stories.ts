import { signal } from '@angular/core';
import type { IPayee } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeEditDialogComponent } from './payee-edit-dialog.component';

const samplePayee: IPayee = {
    id: 'p-1',
    name: 'Whole Foods Market',
    address: '100 Main St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    latitude: null,
    longitude: null,
    phone: '512-555-0100',
    website: 'https://wholefoods.com',
    notes: 'Organic groceries and snacks',
    defaultCategoryId: 'cat-groceries',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
};

const mockLedgerStore = {
    payees: signal<Array<IPayee>>([samplePayee]),
    updatePayee: fn().mockResolvedValue(undefined),
    getOrCreatePayee: fn().mockResolvedValue(undefined)
};

const meta: Meta<PayeeEditDialogComponent> = {
    title: 'Payees/PayeeEditDialog',
    component: PayeeEditDialogComponent,
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
type Story = StoryObj<PayeeEditDialogComponent>;

export const AddPayee: Story = {
    args: {
        isOpen: true,
        payeeToEdit: null
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getAllByText('Add Payee').length).toBeGreaterThan(0);
        const nameInput = body.getByPlaceholderText(/Starbucks, Amazon, Landlord/i);
        expect(nameInput).toBeInTheDocument();
    }
};

export const EditPayee: Story = {
    args: {
        isOpen: true,
        payeeToEdit: samplePayee
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText('Edit Payee')).toBeInTheDocument();
        const nameInput = body.getByPlaceholderText(
            /Starbucks, Amazon, Landlord/i
        ) as HTMLInputElement;
        await expect(nameInput.value).toBe('Whole Foods Market');
    }
};

export const InteractiveValidation: Story = {
    args: {
        isOpen: true,
        payeeToEdit: null
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getAllByText('Add Payee').length).toBeGreaterThan(0);

        // Click Add Payee without filling the name
        const saveBtn = body.getByRole('button', { name: /add payee/i });
        await userEvent.click(saveBtn);

        await expect(body.getByText('Payee name is required.')).toBeInTheDocument();
    }
};
