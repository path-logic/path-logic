import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { DriveReauthBannerComponent } from './drive-reauth-banner.component';

const mockAuthService = {
    accessToken: signal<string | null>(null),
    signInWithGoogle: async () => {}
};

const mockSyncService = {
    syncFromDrive: async () => {}
};

const mockLedgerStore = {
    authError: signal<boolean>(true)
};

const meta: Meta<DriveReauthBannerComponent> = {
    title: 'Sync/DriveReauthBanner',
    component: DriveReauthBannerComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        })
    ],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<DriveReauthBannerComponent>;

export const Default: Story = {
    render: () => ({
        template: `<drive-reauth-banner />`
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Google Drive access token expired/i)).toBeInTheDocument();
        const button = canvas.getByRole('button', { name: /Re-authenticate Drive/i });
        await expect(button).toBeInTheDocument();
        await userEvent.click(button);
    }
};
