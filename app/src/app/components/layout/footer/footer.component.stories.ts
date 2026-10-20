import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { FooterComponent } from './footer.component';

const createMockStores = (
    syncStatus = 'idle',
    authError = false,
    hasLocalFallback = true,
    isSyncing = false,
    onReconnect = fn(async () => {})
) => [
    {
        provide: LedgerStore,
        useValue: {
            syncStatus: signal<string>(syncStatus),
            authError: signal<boolean>(authError),
            hasLocalFallback: signal<boolean>(hasLocalFallback)
        }
    },
    {
        provide: SyncService,
        useValue: {
            isSyncing: signal<boolean>(isSyncing),
            getSyncStatus: () => ({ lastSyncTime: 1700000000000 })
        }
    },
    {
        provide: AuthService,
        useValue: {
            signInWithGoogle: onReconnect
        }
    }
];

const meta: Meta<FooterComponent> = {
    title: 'Layout/FooterComponent',
    component: FooterComponent,
    tags: ['autodocs'],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: createMockStores()
        })
    ]
};

export default meta;
type Story = StoryObj<FooterComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Environment:/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Cloud Sync:/i)).toBeInTheDocument();
    }
};

export const Syncing: Story = {
    decorators: [
        applicationConfig({
            providers: createMockStores('synced', false, true, true)
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Cloud Sync:\s*Active\.\.\./i)).toBeInTheDocument();
    }
};

export const AuthErrorWithReconnect: Story = {
    decorators: [
        applicationConfig({
            providers: createMockStores('error', true, true, false)
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const reconnectBtn = canvas.getByRole('button', { name: /Reconnect Drive/i });
        await expect(reconnectBtn).toBeInTheDocument();
        await userEvent.click(reconnectBtn);
    }
};
