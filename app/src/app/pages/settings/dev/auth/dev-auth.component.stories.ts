import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevAuthComponent } from './dev-auth.component';

export const mockCurrentUser = signal<any>(null);
export const mockIsLoggedIn = signal<boolean>(false);
export const mockAccessToken = signal<string | null>(null);
export const mockAuthError = signal<boolean>(false);

export const mockAuthService = {
    currentUser: mockCurrentUser,
    isLoggedIn: mockIsLoggedIn,
    accessToken: mockAccessToken,
    signInWithGoogle: async () => {
        mockCurrentUser.set({
            uid: 'mock-user-123',
            email: 'dev@pathlogic.io',
            displayName: 'Dev User',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: []
        });
        mockIsLoggedIn.set(true);
        mockAccessToken.set('mock-token-secret-12345678');
    },
    signOut: async () => {
        mockCurrentUser.set(null);
        mockIsLoggedIn.set(false);
        mockAccessToken.set(null);
    }
};

export const mockLedgerStore = {
    authError: mockAuthError,
    accounts: signal<Array<any>>([]),
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    payees: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    isInitialized: signal<boolean>(true),
    syncStatus: signal<string>('idle'),
    hasLocalFallback: signal<boolean>(true),
    syncConflicts: signal<Array<any>>([]),
    mergeCount: signal<number>(0)
};

export const mockSecurityManager = {
    isIdle: signal<boolean>(false),
    startMonitoring: () => {},
    resetTimers: () => {}
};

export const mockSyncService = {
    isSyncing: signal<boolean>(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const meta: Meta<DevAuthComponent> = {
    title: 'Pages/Settings/Dev/DevAuthComponent',
    component: DevAuthComponent,
    includeStories: /^[A-Z]/,
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SecurityManagerService, useValue: mockSecurityManager },
                { provide: SyncService, useValue: mockSyncService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<DevAuthComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Session Status/i)).toBeInTheDocument();
        await expect(canvas.getByText('unauthenticated')).toBeInTheDocument();
        await expect(canvas.getByText('VALID')).toBeInTheDocument();
    }
};

export const AuthenticatedSession: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('authenticated')).toBeInTheDocument();
        await expect(await canvas.findByText(/\*\*\*99887766/)).toBeInTheDocument();
    }
};

export const ExpiredSession: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('RECONNECT_REQUIRED')).toBeInTheDocument();
    }
};

export const InteractiveActions: Story = {
    play: async ({ canvasElement, step }) => {
        mockCurrentUser.set(null);
        mockIsLoggedIn.set(false);
        mockAccessToken.set(null);
        mockAuthError.set(false);

        const canvas = within(canvasElement);

        await step('Sign in via popup button', async () => {
            const signInBtn = canvas.getByRole('button', { name: /Sign in \(Popup\)/i });
            await userEvent.click(signInBtn);
            await expect(canvas.getByText(/authenticated/i)).toBeInTheDocument();
        });

        await step('Simulate expired session', async () => {
            const expireBtn = canvas.getByRole('button', { name: /Simulate Expired Session/i });
            await userEvent.click(expireBtn);
            await expect(canvas.getByText(/RECONNECT_REQUIRED/i)).toBeInTheDocument();
        });

        await step('Reset error state', async () => {
            const resetBtn = canvas.getByRole('button', { name: /Reset Error State/i });
            await userEvent.click(resetBtn);
            await expect(canvas.getByText(/^VALID$/)).toBeInTheDocument();
        });

        await step('End session', async () => {
            const endBtn = canvas.getByRole('button', { name: /End Session/i });
            await userEvent.click(endBtn);
            await expect(canvas.getByText(/unauthenticated/i)).toBeInTheDocument();
        });
    }
};
