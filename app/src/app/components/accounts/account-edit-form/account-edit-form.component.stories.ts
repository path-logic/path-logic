import { AccountType, type IAccount } from '@core';
import { type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AccountEditFormComponent } from './account-edit-form.component';

const MOCK_CHECKING_ACCOUNT: IAccount = {
    id: 'acc-1',
    name: 'Main Checking',
    type: AccountType.Checking,
    institutionName: 'Chase Bank',
    clearedBalance: 150000,
    pendingBalance: 150000,
    isActive: true,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
};

const MOCK_AUTO_LOAN: IAccount = {
    id: 'acc-2',
    name: 'Car Loan',
    type: AccountType.AutoLoan,
    institutionName: 'Honda Financial',
    clearedBalance: -1500000,
    pendingBalance: -1500000,
    isActive: true,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    loanDetails: {
        originalAmount: 2500000,
        interestRate: 0.045,
        termMonths: 60,
        monthlyPayment: 46600,
        paymentDueDay: 15,
        startDate: '2024-01-01T00:00:00Z',
        metadata: {
            vehicleMake: 'Honda',
            vehicleModel: 'Civic'
        }
    }
};

const meta: Meta<AccountEditFormComponent> = {
    title: 'Accounts/AccountEditFormComponent',
    component: AccountEditFormComponent,
    tags: ['autodocs'],
    args: {
        accountData: MOCK_CHECKING_ACCOUNT
    }
};

export default meta;
type Story = StoryObj<AccountEditFormComponent>;

export const CheckingAccountEdit: Story = {
    args: {
        accountData: MOCK_CHECKING_ACCOUNT
    }
};

export const AutoLoanEdit: Story = {
    args: {
        accountData: MOCK_AUTO_LOAN
    }
};

export const InteractiveValidation: Story = {
    args: {
        accountData: MOCK_CHECKING_ACCOUNT
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Clear the required name field
        const nameInput = canvas.getByLabelText(/account name/i);
        await userEvent.clear(nameInput);

        // Try to submit
        const saveBtn = canvas.getByRole('button', { name: /save changes/i });
        await userEvent.click(saveBtn);

        // Verify HTML5 or form validation visually indicates error (input becomes invalid)
        // Angular reactive forms don't always show a text message unless programmed to,
        // but we can assert the input has the ng-invalid class.
        await expect(nameInput).toHaveClass('ng-invalid');
    }
};
