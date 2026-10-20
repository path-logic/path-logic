import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { CalculatorInputComponent } from './calculator-input.component';

const meta: Meta<CalculatorInputComponent> = {
    title: 'UI/CalculatorInput',
    component: CalculatorInputComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    argTypes: {
        placeholder: { control: 'text' },
        disabled: { control: 'boolean' },
        readonly: { control: 'boolean' },
        prefix: { control: 'text' },
        borderless: { control: 'boolean' },
        value: { control: 'number' }
    }
};

export default meta;
type Story = StoryObj<CalculatorInputComponent>;

export const Default: Story = {
    args: {
        placeholder: '$0.00',
        disabled: false,
        prefix: '$'
    }
};

export const FilledValue: Story = {
    args: {
        placeholder: '$0.00',
        disabled: false,
        prefix: '$',
        value: 125000
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox');
        await expect(input).toHaveValue('1,250.00');
    }
};

export const WithCalculation: Story = {
    args: {
        placeholder: '$0.00',
        disabled: false,
        prefix: '$'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox') as HTMLInputElement;

        await userEvent.clear(input);
        await userEvent.type(input, '250 + 50{enter}');

        await expect(input).toHaveValue('300.00');
    }
};

export const Disabled: Story = {
    args: {
        placeholder: '$0.00',
        disabled: true,
        prefix: '$',
        value: 5000
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox');
        await expect(input).toBeDisabled();
    }
};
