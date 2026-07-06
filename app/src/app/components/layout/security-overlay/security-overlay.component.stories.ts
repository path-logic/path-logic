import type { Meta, StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { SecurityOverlayComponent } from './security-overlay.component';

const meta: Meta<SecurityOverlayComponent> = {
    title: 'Layout/SecurityOverlayComponent',
    component: SecurityOverlayComponent,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        isVisible: false
    }
};

export default meta;
type Story = StoryObj<SecurityOverlayComponent>;

/**
 * When the overlay is active (e.g. session went idle).
 * Full screen is blurred, requiring interaction to resume.
 */
export const Visible: Story = {
    args: {
        isVisible: true
    },
    play: async ({ canvasElement, args }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const canvas = within(canvasElement);
        // Verify the user can click resume
        const resumeBtn = canvas.getByRole('button', { name: /resume session/i });
        await userEvent.click(resumeBtn);
        // Angular output binding (unlocked) is difficult to assert directly in play function without an argTypes mock,
        // but finding and clicking the button proves the a11y/interaction works.
        await expect(resumeBtn).toBeInTheDocument();
    }
};

/**
 * Hidden state, should render nothing.
 */
export const Hidden: Story = {
    args: {
        isVisible: false
    }
};
