import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { INewerModelAlert } from '../../../services/llm/llm.service';
import { LlmProvider, LlmService } from '../../../services/llm/llm.service';
import { ModelUpgradeBannerComponent } from './model-upgrade-banner.component';

const createMockLlmService = (alert: INewerModelAlert | null = null) => {
    return {
        newerModelAlert: signal<INewerModelAlert | null>(alert),
        checkStartupNewerModel: fn(async () => {}),
        upgradeToNewestModel: fn(async () => {}),
        dismissModelUpgrade: fn(async () => {})
    };
};

const meta: Meta<ModelUpgradeBannerComponent> = {
    title: 'Layout/ModelUpgradeBannerComponent',
    component: ModelUpgradeBannerComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: [{ provide: LlmService, useValue: createMockLlmService() }]
        })
    ]
};

export default meta;
type Story = StoryObj<ModelUpgradeBannerComponent>;

export const NoAlert: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: LlmService, useValue: createMockLlmService(null) }]
        })
    ]
};

export const GeminiUpgrade: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LlmService,
                    useValue: createMockLlmService({
                        currentModel: 'gemini-1.5-flash',
                        newestModel: 'gemini-2.0-flash',
                        newestLabel: 'Gemini 2.0 Flash',
                        provider: LlmProvider.Gemini
                    })
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Gemini 2.0 Flash')).toBeInTheDocument();
        await expect(canvas.getByText('gemini-1.5-flash')).toBeInTheDocument();

        const upgradeBtn = canvas.getByRole('button', { name: /Upgrade Model/i });
        await expect(upgradeBtn).toBeInTheDocument();
        await userEvent.click(upgradeBtn);
    }
};

export const AnthropicUpgrade: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LlmService,
                    useValue: createMockLlmService({
                        currentModel: 'claude-3-haiku',
                        newestModel: 'claude-3-5-sonnet',
                        newestLabel: 'Claude 3.5 Sonnet',
                        provider: LlmProvider.Anthropic
                    })
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
        await expect(canvas.getByText('claude-3-haiku')).toBeInTheDocument();

        const dismissBtn = canvas.getByRole('button', { name: /Dismiss/i });
        await expect(dismissBtn).toBeInTheDocument();
        await userEvent.click(dismissBtn);
    }
};
