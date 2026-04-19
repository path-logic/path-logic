import type { Signal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { FeatureFlagService } from '../../../services/feature-flag/feature-flag.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { FeatureFlagToggleComponent } from './feature-flag-toggle.component';

/**
 * Mocking services to allow toggling the feature flag in Storybook.
 */
class MockFeatureFlagService {
    private flags = signal<Record<string, boolean>>({
        enable_multi_user: false
    });

    isEnabled(flag: string): Signal<boolean> {
        return computed(() => !!this.flags()[flag]);
    }

    toggle(flag: string, enabled: boolean): void {
        this.flags.update(prev => ({ ...prev, [flag]: enabled }));
    }
}

const mockSettingsStore = {
    updateSetting: async (key: string, value: string) => {
        console.log(`Mock user setting updated: ${key} = ${value}`);
    }
};

const meta: Meta<FeatureFlagToggleComponent> = {
    title: 'Settings/FeatureFlagToggleComponent',
    component: FeatureFlagToggleComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [
                { provide: FeatureFlagService, useClass: MockFeatureFlagService },
                { provide: UserSettingsStore, useValue: mockSettingsStore }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<FeatureFlagToggleComponent>;

export const Default: Story = {
    args: {
        flag: 'enable_multi_user',
        label: 'Enable Multi-User Mode',
        description: 'Allows sharing ledgers with family members.'
    }
};

export const WithoutDescription: Story = {
    args: {
        flag: 'enable_multi_user',
        label: 'Enable Multi-User Mode'
    }
};

export const InteractiveToggle: Story = {
    args: {
        flag: 'enable_multi_user',
        label: 'Interactive Flag',
        description: 'Click me to test the interactive toggle state.'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const toggleBtn = canvas.getByRole('switch');

        // Initially should be off (based on mock)
        // Note: use getByRole('switch') and check aria-checked since it's a styled div/button
        await expect(toggleBtn).toHaveAttribute('aria-checked', 'false');

        // Click to toggle on
        await userEvent.click(toggleBtn);

        // Verify state changed
        await expect(toggleBtn).toHaveAttribute('aria-checked', 'true');
    }
};
