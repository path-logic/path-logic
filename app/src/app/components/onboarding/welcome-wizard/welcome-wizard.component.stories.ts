import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { WelcomeWizardComponent } from './welcome-wizard.component';

const mockSettingsStore = {
    getSetting: () => 'false',
    updateSetting: () => {}
};

const meta: Meta<WelcomeWizardComponent> = {
    title: 'Onboarding/WelcomeWizardComponent',
    component: WelcomeWizardComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        })
    ]
};

export default meta;
type Story = StoryObj<WelcomeWizardComponent>;

export const StepSelectType: Story = {};

export const InteractiveLoanFlow: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Click "More Account Types"
        const showMoreBtn = canvas.getByRole('button', { name: /more account types/i });
        await userEvent.click(showMoreBtn);

        // 2. Select Mortgage
        const mortgageBtn = canvas.getByText('Mortgage').closest('[role="button"]');
        if (!mortgageBtn) throw new Error('Mortgage button not found');
        await userEvent.click(mortgageBtn);

        // 3. Verify the LoanDetailsForm is shown
        await expect(canvas.getByText(/Create Mortgage/i)).toBeInTheDocument();
    }
};
