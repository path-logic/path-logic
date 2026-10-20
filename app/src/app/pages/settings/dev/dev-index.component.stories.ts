import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../services/sync/sync.service';
import { DevIndexComponent } from './dev-index.component';

export const mockAuthService = {
    currentUser: signal<any>({ uid: 'dev-story-admin', email: 'dev@pathlogic.io' }),
    accessToken: signal<string | null>('dev-story-token'),
    isLoggedIn: signal<boolean>(true)
};

export const mockLedgerStore = {
    isInitialized: signal<boolean>(true),
    accounts: signal<Array<any>>([]),
    transactions: signal<Array<any>>([]),
    schedules: signal<Array<any>>([]),
    payees: signal<Array<any>>([]),
    categories: signal<Array<any>>([]),
    syncStatus: signal<string>('idle'),
    authError: signal<boolean>(false),
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

const meta: Meta<DevIndexComponent> = {
    title: 'Pages/Settings/Dev/DevIndexComponent',
    component: DevIndexComponent,
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
type Story = StoryObj<DevIndexComponent>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(
            canvas.getByRole('heading', { name: /Developer Tools/i, level: 1 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /Sync Test Suite/i, level: 2 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /Auth Diagnostics/i, level: 2 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /System Maintenance/i, level: 2 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /QIF Import Diagnostics/i, level: 2 })
        ).toBeInTheDocument();
        await expect(
            canvas.getByRole('heading', { name: /Security Requirement/i, level: 3 })
        ).toBeInTheDocument();
    }
};

export const InteractiveNavigation: Story = {
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);

        await step('Verify all 4 dev tool link cards are present and interactive', async () => {
            const links = canvas.getAllByRole('link');
            const syncLink = links.find(l => l.getAttribute('href') === '/settings/dev/sync-test');
            const authLink = links.find(l => l.getAttribute('href') === '/settings/dev/auth');
            const maintLink = links.find(
                l => l.getAttribute('href') === '/settings/dev/maintenance'
            );
            const qifLink = links.find(l => l.getAttribute('href') === '/settings/dev/qif-test');

            await expect(syncLink).toBeTruthy();
            await expect(authLink).toBeTruthy();
            await expect(maintLink).toBeTruthy();
            await expect(qifLink).toBeTruthy();

            if (authLink) {
                await userEvent.hover(authLink);
            }
        });
    }
};
