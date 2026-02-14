import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within, expect } from 'storybook/test';
import { Input } from '../input';

const meta: Meta<typeof Input> = {
    title: 'Primitives/Input',
    component: Input,
    tags: ['autodocs'],
    argTypes: {
        disabled: { control: 'boolean' },
        type: { control: 'text' },
    },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Type something...',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox');
        await expect(input).toBeVisible();
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
        placeholder: 'Disabled input',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox');
        await expect(input).toBeDisabled();
    },
};

export const Invalid: Story = {
    args: {
        'aria-invalid': true,
        placeholder: 'Invalid input',
        defaultValue: 'Invalid value',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox');
        await expect(input).toHaveAttribute('aria-invalid', 'true');
    },
};

export const Interaction: Story = {
    args: {
        placeholder: 'Interact with me',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox');

        await userEvent.type(input, 'Hello World');
        await expect(input).toHaveValue('Hello World');

        await userEvent.clear(input);
        await expect(input).toHaveValue('');
    },
};
