import { AccountType, PromotionalRateType, type IAccount } from '@core';
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

const MOCK_CREDIT_CARD_ACCOUNT: IAccount = {
    id: 'acc-cc-1',
    name: 'Citi Double Cash Card',
    type: AccountType.Credit,
    institutionName: 'Citi',
    accountNumber: '4491',
    clearedBalance: -300603,
    pendingBalance: -300603,
    isActive: true,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    creditCardDetails: {
        creditLimit: 1010000,
        interestRate: 0.2698,
        minimumPayment: 3500,
        paymentDueDay: 19,
        promotionalRates: [
            {
                id: 'promo-1',
                name: '0% Intro Balance Transfer',
                promoType: PromotionalRateType.BalanceTransfer,
                apr: 0,
                startDate: '2025-09-19',
                endDate: '2027-03-19',
                postPromoApr: 0.2698
            }
        ]
    }
};

const MOCK_AUTO_LOAN: IAccount = {
    id: 'acc-2',
    name: '2001 Cobra',
    type: AccountType.AutoLoan,
    institutionName: 'Ford Motor Credit',
    clearedBalance: -1500000,
    pendingBalance: -1500000,
    isActive: true,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    loanDetails: {
        originalAmount: 3516439,
        interestRate: 0.045,
        termMonths: 60,
        monthlyPayment: 58607,
        paymentDueDay: 15,
        startDate: '2024-01-01T00:00:00Z',
        metadata: {
            vehicleYear: 2001,
            vehicleMake: 'Ford',
            vehicleModel: 'Mustang Cobra',
            vin: '1FAFP47V11F247305'
        }
    }
};

const meta: Meta<AccountEditFormComponent> = {
    title: 'Accounts/AccountEditFormComponent',
    component: AccountEditFormComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
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

export const CreditCardWithPromotionalWindows: Story = {
    args: {
        accountData: MOCK_CREDIT_CARD_ACCOUNT
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const addBtn = canvas.getByTestId('add-promo-window-btn');
        await expect(canvas.getByTestId('promo-window-0')).toBeTruthy();
        await userEvent.click(addBtn);
        await expect(canvas.getByTestId('promo-window-1')).toBeTruthy();
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
