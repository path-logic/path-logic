import type { Meta, StoryObj } from '@storybook/angular';
import { expect } from 'storybook/test';
import { SkeletonComponent } from './skeleton.component';
import { SkeletonShape } from './skeleton.types';

const meta: Meta<SkeletonComponent> = {
    title: 'UI/Skeleton',
    component: SkeletonComponent,
    tags: ['autodocs'],
    argTypes: {
        shape: {
            control: 'select',
            options: Object.values(SkeletonShape)
        },
        width: { control: 'text' },
        height: { control: 'text' },
        styleClass: { control: 'text' },
        ariaLabel: { control: 'text' }
    }
};

export default meta;
type Story = StoryObj<SkeletonComponent>;

export const Default: Story = {
    args: {
        shape: SkeletonShape.Rectangle,
        width: '200px',
        height: '24px'
    },
    play: async ({ canvasElement }) => {
        const el = canvasElement.matches?.('[role="status"]')
            ? canvasElement
            : canvasElement.querySelector('[role="status"]');
        await expect(el).toBeTruthy();
        await expect(el?.getAttribute('aria-busy')).toBe('true');
    }
};

export const CircleAvatar: Story = {
    args: {
        shape: SkeletonShape.Circle,
        width: '48px',
        height: '48px'
    },
    play: async ({ canvasElement }) => {
        const inner = canvasElement.querySelector('div') ?? canvasElement;
        await expect(inner?.className).toContain('rounded-full');
    }
};

export const TextLine: Story = {
    args: {
        shape: SkeletonShape.Text,
        width: '100%'
    },
    play: async ({ canvasElement }) => {
        const inner = canvasElement.querySelector('div') ?? canvasElement;
        await expect(inner?.className).toContain('h-4');
    }
};

export const CardLayout: Story = {
    args: {
        shape: SkeletonShape.Card,
        width: '320px',
        height: '180px'
    },
    play: async ({ canvasElement }) => {
        const inner = canvasElement.querySelector('div') ?? canvasElement;
        await expect(inner?.className).toContain('rounded-xl');
    }
};
