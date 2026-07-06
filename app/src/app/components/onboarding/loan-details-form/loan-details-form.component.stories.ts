import { AccountType } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { LoanDetailsFormComponent } from './loan-details-form.component';

/**
 * Mock UserSettingsStore to prevent FormGuide from crashing.
 */
const mockSettingsStore = {
    getSetting: () => 'false',
    updateSetting: () => {}
};

const meta: Meta<LoanDetailsFormComponent> = {
    title: 'Onboarding/LoanDetailsFormComponent',
    component: LoanDetailsFormComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        })
    ],
    args: {
        type: AccountType.Mortgage
    }
};

export default meta;
type Story = StoryObj<LoanDetailsFormComponent>;

export const Mortgage: Story = {
    args: {
        type: AccountType.Mortgage
    }
};

export const AutoLoan: Story = {
    args: {
        type: AccountType.AutoLoan
    }
};

export const InteractiveValidation: Story = {
    args: {
        type: AccountType.AutoLoan
    },
    play: async ({ canvasElement }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const canvas = within(canvasElement);

        // Clear the default account name to trigger validation
        const accountNameInput = canvas.getByPlaceholderText(/home mortgage/i);
        await userEvent.clear(accountNameInput);

        // Click create without filling anything
        const createBtn = canvas.getByRole('button', { name: /create loan account/i });
        await userEvent.click(createBtn);

        // Verify required validation errors appear
        await new Promise(resolve => setTimeout(resolve, 100));
        await expect(canvas.getByText(/loan name is required/i)).toBeInTheDocument();
        await expect(canvas.getByText(/original amount is required/i)).toBeInTheDocument();

        // Fill out valid data
        await userEvent.type(accountNameInput, 'Honda Civic');
        await userEvent.type(
            canvas.getByRole('spinbutton', { name: /original loan amount/i }),
            '25000'
        );
        await userEvent.type(canvas.getByRole('spinbutton', { name: /interest rate/i }), '4.5');

        // Note: We don't click submit again because the output event would fire and we
        // just want to verify the error state clearing and inputs accepting data.
    }
};
