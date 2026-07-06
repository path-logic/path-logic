import { Component, signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
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

const mockSettingsStore = {
    getSetting: () => 'false',
    updateSetting: () => {}
};

const meta: Meta<ComboOnboardingComponent> = {
    title: 'Combo Compositions/3. Onboarding Flow',
    component: ComboOnboardingComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: [{ provide: UserSettingsStore, useValue: mockSettingsStore }]
        })
    ]
};

export default meta;
type Story = StoryObj<ComboOnboardingComponent>;

export const FullWizardWithDialog: Story = {};
