import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AuthOverlayComponent } from './auth-overlay.component';

/**
 * Mocks the LedgerStore to control the showOverlay computed signal:
 * showOverlay = authError && !isInitialized && !hasLocalFallback
 */
const createMockStore = (authError: boolean, isInitialized: boolean, hasLocalFallback: boolean) => {
    return {
        authError: signal(authError),
        isInitialized: signal(isInitialized),
        hasLocalFallback: signal(hasLocalFallback)
    };
};

export const signInWithGoogleMock = fn().mockResolvedValue(undefined);

const meta: Meta<AuthOverlayComponent> = {
    title: 'Auth/AuthOverlayComponent',
    component: AuthOverlayComponent,
    tags: ['autodocs'],
    excludeStories: /.*Mock/,
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<AuthOverlayComponent>;

/**
 * The overlay is hidden when the session is valid and there's no auth error.
 */
export const Hidden: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockStore(false, true, true) },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByRole('heading', { name: /session expired/i })).toBeNull();
    }
};

/**
 * The overlay is visible when there's an auth error, initialization failed,
 * and there is no local fallback data to rely on.
 */
export const VisibleSessionExpired: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockStore(true, false, false) },
                { provide: AuthService, useValue: { signInWithGoogle: signInWithGoogleMock } }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        signInWithGoogleMock.mockClear();
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { name: /session expired/i })).toBeInTheDocument();
        await expect(
            canvas.getByText(/Authentication with Google Drive is required to continue/i)
        ).toBeInTheDocument();

        const reauthBtn = canvas.getByRole('button', { name: /re-authenticate session/i });
        await expect(reauthBtn).toBeInTheDocument();
        await userEvent.click(reauthBtn);

        expect(signInWithGoogleMock).toHaveBeenCalled();
    }
};
