import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { GlossaryTermComponent } from './glossary-term.component';

const meta: Meta<GlossaryTermComponent> = {
    title: 'UI/GlossaryTerm',
    component: GlossaryTermComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    argTypes: {
        term: { control: 'text' },
        customDefinition: { control: 'text' }
    }
};

export default meta;
type Story = StoryObj<GlossaryTermComponent>;

export const Default: Story = {
    args: {
        term: 'AES-GCM 256'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const termElement = canvas.getByRole('button');

        await userEvent.hover(termElement);
        const tooltip = await canvas.findByRole('tooltip');
        await expect(tooltip).toBeInTheDocument();
        await expect(tooltip).toHaveTextContent(/Military-grade encryption/i);

        await userEvent.unhover(termElement);
        await expect(canvas.queryByRole('tooltip')).not.toBeInTheDocument();
    }
};

export const CustomDefinition: Story = {
    args: {
        term: 'Zero-Knowledge Proof',
        customDefinition:
            'A cryptographic method proving you know a value without revealing the value itself.'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const termElement = canvas.getByRole('button');

        await termElement.focus();
        const tooltip = await canvas.findByRole('tooltip');
        await expect(tooltip).toBeInTheDocument();
        await expect(tooltip).toHaveTextContent(/cryptographic method/i);

        await termElement.blur();
        await waitFor(() => {
            expect(canvas.queryByRole('tooltip')).not.toBeInTheDocument();
        });
    }
};
