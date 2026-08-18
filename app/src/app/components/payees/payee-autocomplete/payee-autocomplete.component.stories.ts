import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeAutocompleteComponent } from './payee-autocomplete.component';

const mockLedgerStore = {
    payees: signal([
        { id: 'p-1', name: 'Netflix' },
        { id: 'p-2', name: "Trader Joe's" },
        { id: 'p-3', name: 'Target' },
        { id: 'p-4', name: 'Whole Foods' }
    ])
};

const meta: Meta<PayeeAutocompleteComponent> = {
    title: 'Payees/PayeeAutocomplete',
    component: PayeeAutocompleteComponent,
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
type Story = StoryObj<PayeeAutocompleteComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('combobox');
        await expect(input).toBeInTheDocument();

        // Focus & type into input to trigger suggestions dropdown
        await userEvent.type(input, 'Net');
        await expect(canvas.getByRole('listbox')).toBeInTheDocument();
        await expect(canvas.getByText('Netflix')).toBeInTheDocument();
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    },
    render: () => ({
        template: `
            <div class="p-6 bg-surface-950 dark">
                <payee-autocomplete></payee-autocomplete>
            </div>
        `
    })
};
