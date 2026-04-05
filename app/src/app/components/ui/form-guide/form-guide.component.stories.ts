import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { FormGuideComponent } from './form-guide.component';

/**
 * State to control mock UserSettingsStore
 */
let showGuides = true;

const mockSettingsStore = {
    getSetting: (key: string) => {
        if (key.endsWith('_disabled')) {
            return showGuides ? 'false' : 'true';
        }
        return 'false';
    },
    updateSetting: async (key: string, value: string) => {
        if (key.endsWith('_disabled')) {
            showGuides = value === 'false';
        }
    },
};

const meta: Meta<FormGuideComponent> = {
    title: 'UI/FormGuideComponent',
    component: FormGuideComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }],
        }),
    ],
};

export default meta;
type Story = StoryObj<FormGuideComponent>;

export const Default: Story = {
    args: {
        guideId: 'form-guide-1',
        targetFieldId: 'interestRate',
        content: {
            interestRate: {
                title: 'Interest Rate',
                description:
                    'Enter the annual percentage rate (APR) provided by your lender. Usually between 3% and 8% for a mortgage.',
            },
        },
    },
    // Reset global state for this story
    parameters: {
        beforeEach: () => {
            showGuides = true;
        },
    },
};

export const InactiveBackground: Story = {
    args: {
        guideId: 'form-guide-1',
        targetFieldId: 'monthlyPayment',
        content: {
            interestRate: {
                title: 'Interest Rate',
                description: 'This guide belongs to a field that is NOT currently focused.',
            },
        },
    },
    parameters: {
        beforeEach: () => {
            showGuides = true;
        },
    },
};

export const InteractiveDismiss: Story = {
    args: {
        guideId: 'form-guide-1',
        targetFieldId: 'testField',
        content: {
            testField: {
                title: 'Dismissible Guide',
                description: 'You can test dismissing this guide forever.',
            },
        },
    },
    parameters: {
        beforeEach: () => {
            showGuides = true;
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Ensure visible
        await expect(canvas.getByText(/Dismissible Guide/i)).toBeInTheDocument();

        // Click disable (represented by EyeOff icon, matching title/aria-label)
        const disableBtn = canvas.getByRole('button', { name: /Disable Intelligence Guide/i });
        await userEvent.click(disableBtn);

        // After updating the store (mock), the signal recalculates, and the component hides.
        // The *ngIf removes it from the DOM.
        // Wait for change detection hook
        await new Promise(resolve => setTimeout(resolve, 100));
        await expect(canvas.queryByText(/dismissible guide/i)).not.toBeInTheDocument();
    },
};
