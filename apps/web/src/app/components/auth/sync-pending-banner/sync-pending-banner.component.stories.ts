import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

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
        syncStatus: signal(syncStatus),
    };
};

const meta: Meta<SyncPendingBannerComponent> = {
    title: 'Auth/SyncPendingBannerComponent',
    component: SyncPendingBannerComponent,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SyncPendingBannerComponent>;

/**
 * The banner is hidden normally when everything is synced and auth is working.
 */
export const Hidden: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: LedgerStore, useValue: createMockStore(false, false, 'idle') }],
        }),
    ],
};

/**
 * The banner appears if the user has an auth error but continues making local changes.
 */
export const VisibleUnsyncedData: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockStore(true, true, 'pending-local') },
            ],
        }),
    ],
};

/**
 * The banner also appears if there are no new local changes,
 * but a previous local sync is still pending upload due to auth error.
 */
export const VisiblePendingUpload: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockStore(true, false, 'pending-local') },
            ],
        }),
    ],
};
