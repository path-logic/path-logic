import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SyncIndicatorComponent } from './sync-indicator.component';

/**
 * Helper to create a specific sync state.
 */
const createMockState = (
    syncStatus: string,
    authError: boolean,
    isSyncing: boolean,
    lastSyncTime: number,
) => {
    return [
        {
            provide: LedgerStore,
            useValue: {
                syncStatus: signal(syncStatus),
                authError: signal(authError),
                hasLocalFallback: signal(true),
            },
        },
        {
            provide: SyncService,
            useValue: {
                isSyncing: signal(isSyncing),
                getSyncStatus: () => ({ lastSyncTime }),
            },
        },
        {
            provide: AuthService,
            useValue: {
                signInWithGoogle: async () => console.log('Mock signInWithGoogle called'),
            },
        },
    ];
};

const meta: Meta<SyncIndicatorComponent> = {
    title: 'Layout/SyncIndicatorComponent',
    component: SyncIndicatorComponent,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SyncIndicatorComponent>;

/**
 * The default state when the app is idle and sync is up-to-date.
 */
export const IdleSynced: Story = {
    decorators: [
        applicationConfig({
            providers: createMockState('idle', false, false, Date.now() - 120000), // 2 mins ago
        }),
    ],
};

/**
 * The state when the app is actively pushing or pulling data from Google Drive.
 */
export const ActiveSyncing: Story = {
    decorators: [
        applicationConfig({
            providers: createMockState('idle', false, true, Date.now() - 5000), // 5 seconds ago
        }),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/active/i)).toBeInTheDocument();
    },
};

/**
 * The state when an authentication error occurred (e.g., session expired).
 * Shows a warning icon and allows clicking to reconnect.
 */
export const AuthError: Story = {
    decorators: [
        applicationConfig({
            providers: createMockState('error', true, false, Date.now() - 3600000), // 1 hour ago
        }),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/sync error/i)).toBeInTheDocument();
        const button = canvas.getByRole('button');
        await userEvent.click(button); // Should trigger signInWithGoogle (mocked)
    },
};

/**
 * The state when the app is working locally but changes haven't been pushed yet
 * (usually due to auth error, but optimistic UI continues).
 */
export const LocalOnly: Story = {
    decorators: [
        applicationConfig({
            providers: createMockState('pending-local', true, false, Date.now() - 3600000), // 1 hour ago
        }),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/local only/i)).toBeInTheDocument();
    },
};
