import type { IAccount } from '@core';
import { AccountType } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { AccountDropdownComponent } from './account-dropdown.component';

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase Bank',
        clearedBalance: -242102,
        pendingBalance: -242102,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        deletedAt: null
    },
    {
        id: 'acc-2',
        name: 'High Yield Savings',
        type: AccountType.Savings,
        institutionName: 'Ally Financial',
        clearedBalance: 1545000,
        pendingBalance: 1545000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        deletedAt: null
    },
    {
        id: 'acc-3',
        name: 'Primary Credit Card',
        type: AccountType.Credit,
        institutionName: 'Amex',
        clearedBalance: -85000,
        pendingBalance: -85000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        deletedAt: null
    },
    {
        id: 'acc-4',
        name: 'Home Mortgage',
        type: AccountType.Mortgage,
        institutionName: 'Rocket Mortgage',
        clearedBalance: -32000000,
        pendingBalance: -32000000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        deletedAt: null
    }
];

const meta: Meta<AccountDropdownComponent> = {
    title: 'Ledger/AccountDropdown',
    component: AccountDropdownComponent,
    parameters: {
        layout: 'centered'
    },
    render: args => ({
        props: {
            ...args,
            accounts: mockAccounts,
            selectedAccountId: 'acc-1'
        },
        template: `
            <div class="w-[320px] p-4 bg-brand-surface border border-brand-border rounded-2xl">
                <account-dropdown
                    [accounts]="accounts"
                    [(selectedAccountId)]="selectedAccountId"
                />
            </div>
        `
    })
};

export default meta;
type Story = StoryObj<AccountDropdownComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: /Select Account/i });
        await expect(trigger).toBeInTheDocument();
        await expect(canvas.getByText('Main Checking')).toBeInTheDocument();
    }
};

export const OpenMenu: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: /Select Account/i });
        await userEvent.click(trigger);

        const listbox = canvas.getByRole('listbox');
        await expect(listbox).toBeInTheDocument();
        await expect(canvas.getByText('High Yield Savings')).toBeInTheDocument();
        await expect(canvas.getByText('Add New Account')).toBeInTheDocument();
    }
};

export const SelectNewOption: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: /Select Account/i });
        await userEvent.click(trigger);

        const savingsOption = canvas.getByText('High Yield Savings');
        await userEvent.click(savingsOption);

        // Verify newly selected account is rendered in trigger
        await expect(canvas.getByText('High Yield Savings')).toBeInTheDocument();
    }
};
