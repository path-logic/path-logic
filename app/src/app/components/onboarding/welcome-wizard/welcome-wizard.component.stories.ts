import { signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { WelcomeWizardComponent } from './welcome-wizard.component';

const mockSettingsStore = {
    getSetting: () => 'false',
    updateSetting: () => {}
};

const mockPostHogService = {
    posthog: {
        capture: () => {}
    }
};

const mockImportService = {
    progress: signal({ stage: 'idle', pct: 0, processed: 0, total: 0, tier: 'small' }),
    stats: signal(null),
    reset: () => {},
    startImport: () => {},
    commitImport: async () => []
};

const mockRouter = {
    navigate: async () => true
};

const meta: Meta<WelcomeWizardComponent> = {
    title: 'Onboarding/WelcomeWizardComponent',
    component: WelcomeWizardComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [
                { provide: UserSettingsStore, useValue: mockSettingsStore },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: Router, useValue: mockRouter }
            ]
        })
    ],
    parameters: {
        a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } }
    }
};

export default meta;
type Story = StoryObj<WelcomeWizardComponent>;

export const StepSelectType: Story = {};

export const InteractiveStandardFlow: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Click Checking Account
        const checkingText = await canvas.findByText('Checking Account');
        const checkingBtn = checkingText.closest('[role="button"]');
        if (!checkingBtn) throw new Error('Checking button not found');
        await userEvent.click(checkingBtn);

        // 2. Verify we are on details step with prefilled name
        const input = await canvas.findByLabelText(/account name/i);
        await expect(input).toBeInTheDocument();
        await expect((input as HTMLInputElement).value).toBe('Main Checking');
    }
};

export const InteractiveLoanFlow: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Wait for Angular and PrimeNG Stepper to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Click "More Account Types"
        const showMoreBtn = await canvas.findByRole('button', { name: /more account types/i });
        await userEvent.click(showMoreBtn);

        // 2. Select Mortgage
        const mortgageText = await canvas.findByText('Mortgage');
        const mortgageBtn = mortgageText.closest('[role="button"]');
        if (!mortgageBtn) throw new Error('Mortgage button not found');
        await userEvent.click(mortgageBtn);

        // 3. Verify the LoanDetailsForm is shown
        await expect(await canvas.findByText(/Create Mortgage/i)).toBeInTheDocument();
    }
};
