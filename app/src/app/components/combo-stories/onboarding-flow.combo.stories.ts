import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { provideStoryFixtures, StoryPreset } from '../../testing/story-fixtures';
import { NewAccountDialogComponent } from '../onboarding/new-account-dialog/new-account-dialog.component';
import { WelcomeWizardComponent } from '../onboarding/welcome-wizard/welcome-wizard.component';

@Component({
    selector: 'combo-onboarding',
    standalone: true,
    imports: [WelcomeWizardComponent, NewAccountDialogComponent],
    template: `
        <div class="min-h-screen bg-black/90 pt-12 relative isolate">
            <!-- The wizard sits in the center of the screen -->
            <welcome-wizard class="max-w-4xl mx-auto block"></welcome-wizard>

            <!-- The dialog is triggered globally by state, we force it open for this story -->
            <new-account-dialog [isOpen]="dialogOpen()"></new-account-dialog>

            <button
                (click)="dialogOpen.set(true)"
                class="absolute bottom-8 right-8 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors"
            >
                Simulate Dialog Open
            </button>
        </div>
    `
})
export class ComboOnboardingComponent {
    dialogOpen = signal(false);
}

const meta: Meta<ComboOnboardingComponent> = {
    title: 'Combo Compositions/3. Onboarding Flow',
    component: ComboOnboardingComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: provideStoryFixtures({ preset: StoryPreset.Empty })
        })
    ]
};

export default meta;
type Story = StoryObj<ComboOnboardingComponent>;

export const FullWizardWithDialog: Story = {
    play: async ({ canvasElement }) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);

        // 1. Verify Welcome Wizard baseline cards
        expect(await canvas.findByText(/Welcome to Path Logic/i)).toBeInTheDocument();
        expect(await canvas.findByText(/Checking Account/i)).toBeInTheDocument();

        // 2. Open New Account Dialog via Simulate button
        const simulateBtn = await canvas.findByRole('button', { name: /simulate dialog open/i });
        await userEvent.click(simulateBtn);

        // 3. Verify dialog opens and select Checking
        const dialog = await body.findByRole('dialog');
        await expect(dialog).toBeInTheDocument();
        const checkingOption = await within(dialog).findByText(/Checking/i);
        await userEvent.click(checkingOption);

        // 4. Verify step 2 (enter details) rendered
        await expect(
            await within(dialog).findByText(/Daily spending & income/i)
        ).toBeInTheDocument();

        // 5. Enter starting balance
        const balanceInput = await within(dialog).findByLabelText(/starting balance/i);
        await userEvent.clear(balanceInput);
        await userEvent.type(balanceInput, '2500');

        // 6. Verify Create Only button is enabled
        const createBtn = await within(dialog).findByRole('button', { name: /create only/i });
        await expect(createBtn).toBeEnabled();
    }
};
