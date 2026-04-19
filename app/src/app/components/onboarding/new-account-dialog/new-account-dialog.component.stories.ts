import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { NewAccountDialogComponent } from './new-account-dialog.component';

const mockSettingsStore = {
    getSetting: () => 'false',
    updateSetting: () => {}
};

const meta: Meta<NewAccountDialogComponent> = {
    title: 'Onboarding/NewAccountDialogComponent',
    component: NewAccountDialogComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<NewAccountDialogComponent>;

export const Open: Story = {
    args: {
        isOpen: true
    }
};

export const Closed: Story = {
    args: {
        isOpen: false
    }
};

export const InteractiveStandardAccountFlow: Story = {
    args: {
        isOpen: true
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Select Checking
        const checkingBtn = canvas.getByText(/Checking/i);
        await userEvent.click(checkingBtn);

        // Now we should be on the details step
        await expect(canvas.getByText(/Configure Checking/i)).toBeInTheDocument();

        // 3. Fill details (Account Name is auto-filled to 'Main Checking')
        await userEvent.type(canvas.getByLabelText(/starting balance/i), '1500');

        // 4. Click Create
        const createBtn = canvas.getByRole('button', { name: /create account/i });
        await expect(createBtn).not.toBeDisabled();
        // userEvent.click(createBtn); // Would fire angular output
    }
};
