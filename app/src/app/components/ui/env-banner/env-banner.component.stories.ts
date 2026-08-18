import type { Meta, StoryObj } from '@storybook/angular';
import { expect } from 'storybook/test';
import { EnvBannerComponent } from './env-banner.component';

const meta: Meta<EnvBannerComponent> = {
    title: 'UI/EnvBanner',
    component: EnvBannerComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: true }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<EnvBannerComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const text = canvasElement.querySelector('.env-text');
        if (text) {
            await expect(text.textContent?.trim().length).toBeGreaterThan(0);
        }
    }
};
