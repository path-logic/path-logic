import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncPendingBannerComponent } from './sync-pending-banner.component';

/**
 * Mocks the LedgerStore to control the showBanner computed signal:
 * showBanner = authError && (isDirty || syncStatus === 'pending-local')
 */
const createMockStore = (authError: boolean, isDirty: boolean, syncStatus: string) => {
    return {
        authError: signal(authError),
        isDirty: signal(isDirty),
        syncStatus: signal(syncStatus)
    };
};

export const signInWithGoogleMock = fn().mockResolvedValue(undefined);

const meta: Meta<SyncPendingBannerComponent> = {
    title: 'Auth/SyncPendingBannerComponent',
    component: SyncPendingBannerComponent,
    tags: ['autodocs'],
    excludeStories: /.*Mock/,
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<SyncPendingBannerComponent>;

/**
 * The banner is hidden normally when everything is synced and auth is working.
 */
export const Hidden: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockStore(false, false, 'idle') },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByText(/Cloud Sync Disconnected/i)).toBeNull();
    }
};

/**
 * The banner appears if the user has an auth error but continues making local changes.
 */
export const VisibleUnsyncedData: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: createMockStore(true, true, 'pending-local')
                },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        signInWithGoogleMock.mockClear();
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Cloud Sync Disconnected/i)).toBeInTheDocument();

        const btn = canvas.getByRole('button', { name: /reconnect to google drive/i });
        await userEvent.click(btn);
        expect(signInWithGoogleMock).toHaveBeenCalled();
    }
};

/**
 * The banner also appears if there are no new local changes,
 * but a previous local sync is still pending upload due to auth error.
 */
export const VisiblePendingUpload: Story = {
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: LedgerStore,
                    useValue: createMockStore(true, false, 'pending-local')
                },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Cloud Sync Disconnected/i)).toBeInTheDocument();
    }
};
