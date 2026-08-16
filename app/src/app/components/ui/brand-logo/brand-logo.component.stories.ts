import type { Meta, StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { BrandLogoComponent } from './brand-logo.component';

const meta: Meta<BrandLogoComponent> = {
    title: 'UI/BrandLogo',
    component: BrandLogoComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: true }]
            }
        }
    },
    argTypes: {
        size: {
            control: { type: 'select' },
            options: ['sm', 'md', 'lg']
        },
        variant: {
            control: { type: 'select' },
            options: ['full', 'icon-only', 'stacked']
        },
        env: {
            control: { type: 'select' },
            options: [undefined, 'dev', 'staging', 'prod']
        },
        color: {
            control: { type: 'color' }
        }
    }
};

export default meta;
type Story = StoryObj<BrandLogoComponent>;

export const Default: Story = {
    args: {
        size: 'md',
        variant: 'full'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const pathText = canvas.getByText('PATH');
        const logicText = canvas.getByText('LOGIC');
        await expect(pathText).toBeTruthy();
        await expect(logicText).toBeTruthy();
    }
};

export const Small: Story = {
    args: {
        size: 'sm',
        variant: 'full'
    },
    play: async ({ canvasElement }) => {
        const badge = canvasElement.querySelector('.brand-badge');
        await expect(badge?.classList.contains('w-5')).toBe(true);
    }
};

export const Large: Story = {
    args: {
        size: 'lg',
        variant: 'full'
    },
    play: async ({ canvasElement }) => {
        const badge = canvasElement.querySelector('.brand-badge');
        await expect(badge?.classList.contains('w-12')).toBe(true);
    }
};

export const IconOnly: Story = {
    args: {
        size: 'md',
        variant: 'icon-only'
    },
    play: async ({ canvasElement }) => {
        const wordmark = canvasElement.querySelector('.brand-wordmark');
        await expect(wordmark).toBeFalsy();
    }
};

export const Stacked: Story = {
    args: {
        size: 'lg',
        variant: 'stacked'
    },
    play: async ({ canvasElement }) => {
        const container = canvasElement.querySelector('[aria-label="Path Logic"]');
        await expect(container?.classList.contains('flex-col')).toBe(true);
    }
};

export const DevEnvironment: Story = {
    args: {
        size: 'md',
        variant: 'full',
        env: 'dev'
    },
    play: async ({ canvasElement }) => {
        const circle = canvasElement.querySelector('circle');
        await expect(circle?.getAttribute('fill')).toBe('#3b82f6');
    }
};

export const StagingEnvironment: Story = {
    args: {
        size: 'md',
        variant: 'full',
        env: 'staging'
    },
    play: async ({ canvasElement }) => {
        const circle = canvasElement.querySelector('circle');
        await expect(circle?.getAttribute('fill')).toBe('#f97316');
    }
};

export const ProdEnvironment: Story = {
    args: {
        size: 'md',
        variant: 'full',
        env: 'prod'
    },
    play: async ({ canvasElement }) => {
        const circle = canvasElement.querySelector('circle');
        await expect(circle?.getAttribute('fill')).toBe('#a855f7');
    }
};
