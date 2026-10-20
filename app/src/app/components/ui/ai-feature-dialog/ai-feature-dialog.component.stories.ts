import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, fn, userEvent } from 'storybook/test';

import { AiFeatureDialogComponent } from './ai-feature-dialog.component';

const meta: Meta<AiFeatureDialogComponent> = {
    title: 'UI/AiFeatureDialog',
    component: AiFeatureDialogComponent,
    decorators: [
        applicationConfig({
            providers: [provideRouter([])]
        })
    ],
    parameters: {
        layout: 'centered'
    },
    args: {
        visible: true,
        featureName: 'AI Recurring Pattern Discovery',
        description:
            'Path Logic analyzes transaction history to detect repeating bills, subscriptions, and income intervals.',
        benefits: [
            'Detect recurring utility bills and streaming subscriptions',
            'Estimate repeating intervals (Weekly, Monthly, Bi-weekly)',
            'Generate high-accuracy cashflow forecasts'
        ],
        canRunOffline: true,
        offlineActionLabel: 'Run Offline Analysis',
        runOffline: fn()
    }
};

export default meta;
type Story = StoryObj<AiFeatureDialogComponent>;

export const Default: Story = {};

export const WithoutOfflineFallback: Story = {
    args: {
        featureName: 'AI Merchant Auto-Categorization',
        description: 'Classify imported bank descriptions into standard budget categories with AI.',
        canRunOffline: false,
        benefits: [
            'Automatic classification of complex merchant names',
            'Context-aware categorization based on spending history'
        ]
    }
};

export const InteractionTest: Story = {
    play: async ({ args }) => {
        const offlineBtn = document.body.querySelector(
            'button[aria-label="Run Offline Analysis"]'
        ) as HTMLButtonElement | null;
        await expect(offlineBtn).toBeTruthy();
        if (offlineBtn) {
            await userEvent.click(offlineBtn);
        }

        await expect(args.runOffline).toHaveBeenCalled();
    }
};
