import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { SettingsPageComponent } from './settings-page.component';

const meta: Meta<SettingsPageComponent> = {
    title: 'Pages/Settings',
    component: SettingsPageComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: [provideNoopAnimations(), provideRouter([])]
        })
    ]
};

export default meta;
type Story = StoryObj<SettingsPageComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify key headers and sections
        await expect(canvas.getByText(/System/i)).toBeInTheDocument();
        await expect(canvas.getByText(/AI Integration/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Data Backup & Storage/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Appearance/i)).toBeInTheDocument();
        await expect(canvas.getByText(/System Architecture/i)).toBeInTheDocument();

        // Verify theme buttons exist
        const lightBtn = canvas.getByRole('button', { name: /light/i });
        await expect(lightBtn).toBeInTheDocument();
        await userEvent.click(lightBtn);

        // Verify setup guide toggle
        const guideToggle = canvas.getByText(/How do I obtain an API Key\?/i);
        await expect(guideToggle).toBeInTheDocument();
        await userEvent.click(guideToggle);

        // Verify guide contents expand
        await expect(canvas.getByText(/Google Gemini/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Anthropic Claude/i)).toBeInTheDocument();
        await expect(canvas.getByText(/OpenAI/i)).toBeInTheDocument();
    }
};

export const LightMode: Story = {
    parameters: {
        theme: 'light'
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    }
};

export const MobileViewport: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'mobile1'
        }
    }
};

export const TabletViewport: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'tablet'
        }
    }
};
