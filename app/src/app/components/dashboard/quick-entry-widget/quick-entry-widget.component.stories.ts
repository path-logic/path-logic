import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { QuickEntryWidgetComponent } from './quick-entry-widget.component';

const mockLedgerStore = {
    accounts: signal([
        {
            id: 'acc-1',
            name: 'Checking',
            institutionName: 'Chase',
            type: 'checking',
            balance: 1487050,
            isActive: true
        },
        {
            id: 'acc-2',
            name: 'Savings',
            institutionName: 'Marcus',
            type: 'savings',
            balance: 4532110,
            isActive: true
        }
    ]),
    payees: signal([
        { id: 'p-1', name: 'Netflix' },
        { id: 'p-2', name: "Trader Joe's" }
    ]),
    addTransaction: async () => {}
};

const meta: Meta<QuickEntryWidgetComponent> = {
    title: 'Dashboard/QuickEntryWidget',
    component: QuickEntryWidgetComponent,
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        })
    ],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: true }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<QuickEntryWidgetComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Quick Entry/i)).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: /Save Transaction/i })).toBeInTheDocument();

        // Toggle type to Income
        const incomeBtn = canvas.getByRole('button', { name: /Income/i });
        await userEvent.click(incomeBtn);
        await expect(incomeBtn).toHaveAttribute('aria-pressed', 'true');
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    },
    render: () => ({
        template: `
            <div class="p-6 bg-surface-950 dark">
                <quick-entry-widget></quick-entry-widget>
            </div>
        `
    })
};
