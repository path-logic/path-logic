import { Component } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { FeatureFlagService } from '../../services/feature-flag/feature-flag.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { FeatureFlagToggleComponent } from '../settings/feature-flag-toggle/feature-flag-toggle.component';
import { FormGuideComponent } from '../ui/form-guide/form-guide.component';

@Component({
    selector: 'app-combo-settings',
    standalone: true,
    imports: [FeatureFlagToggleComponent, FormGuideComponent],
    template: `
        <div class="h-screen bg-black p-8 text-white relative">
            <div class="max-w-2xl">
                <h1 class="text-3xl font-light mb-8">Advanced Settings</h1>

                <div class="space-y-6 bg-white/5 border border-white/10 p-6 rounded-2xl relative">
                    <app-feature-flag-toggle
                        flag="enable_multi_user"
                        label="Enable Multi-User Mode"
                        description="Share your ledgers with family members. This feature is in beta."
                    ></app-feature-flag-toggle>

                    <hr class="border-white/10" />

                    <app-feature-flag-toggle
                        flag="use_demo_data"
                        label="Use Demo Data"
                        description="Populates the app with fake transaction data for testing."
                    ></app-feature-flag-toggle>

                    <hr class="border-white/10" />

                    <!-- Form Guide positioned absolutely next to the settings container -->
                    <app-form-guide
                        guideId="combo-guide"
                        targetFieldId="experimental"
                        [content]="guideContent"
                        class="absolute -right-[340px] top-6 w-80"
                    ></app-form-guide>
                </div>
            </div>
        </div>
    `,
})
export class ComboSettingsComponent {
    guideContent = {
        experimental: {
            title: 'Experimental Features',
            description:
                'Toggling these flags may cause unexpected behavior. Proceed with caution.',
        },
    };
}

import { computed, signal } from '@angular/core';
// ...
class MockFeatureFlagService {
    isEnabled(flag: string) {
        return computed(() => flag === 'enable_multi_user');
    }
    toggle() {}
}

const mockSettingsStore = {
    getSetting: () => 'true',
    updateSetting: () => {},
};

const meta: Meta<ComboSettingsComponent> = {
    title: 'Combo Compositions/4. Settings Dashboard',
    component: ComboSettingsComponent,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        applicationConfig({
            providers: [
                { provide: FeatureFlagService, useClass: MockFeatureFlagService },
                { provide: UserSettingsStore, useValue: mockSettingsStore },
            ],
        }),
    ],
};

export default meta;
type Story = StoryObj<ComboSettingsComponent>;

export const SettingsWithGuides: Story = {};
