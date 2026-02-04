import type { Meta, StoryObj } from '@storybook/nextjs';
import { userEvent, within, expect } from '@storybook/test';
import { Switch } from '../switch';
import { Label } from '../label';

const meta: Meta<typeof Switch> = {
    title: 'Primitives/Switch',
    component: Switch,
    tags: ['autodocs'],
    argTypes: {
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {
        'aria-label': 'Toggle feature',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const switchEl = canvas.getByRole('switch');
        await expect(switchEl).toBeVisible();
    },
};

export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Airplane Mode</Label>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const switchEl = canvas.getByLabelText('Airplane Mode');
        await expect(switchEl).toBeInTheDocument();
    },
};

export const Interaction: Story = {
    args: {
        'aria-label': 'Toggle test',
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        const switchEl = canvas.getByRole('switch');

        await step('Toggle On', async () => {
            await userEvent.click(switchEl);
            await expect(switchEl).toBeChecked();
        });

        await step('Toggle Off', async () => {
            await userEvent.click(switchEl);
            await expect(switchEl).not.toBeChecked();
        });
    },
};
