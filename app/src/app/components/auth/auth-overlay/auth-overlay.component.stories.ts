import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

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

const meta: Meta<AuthOverlayComponent> = {
    title: 'Auth/AuthOverlayComponent',
    component: AuthOverlayComponent,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
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
                { provide: AuthService, useValue: { signInWithGoogle: async () => {} } }
            ]
        })
    ]
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
                { provide: AuthService, useValue: { signInWithGoogle: async () => {} } }
            ]
        })
    ]
};
