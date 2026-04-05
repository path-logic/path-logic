import { signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { FooterComponent } from './footer.component';

/**
 * Mocking the stores needed by the deeply nested SyncIndicatorComponent
 */
const mockStores = [
    {
        provide: LedgerStore,
        useValue: {
            syncStatus: signal('idle'),
            authError: signal(false),
            hasLocalFallback: signal(true),
        },
    },
    {
        provide: SyncService,
        useValue: {
            isSyncing: signal(false),
            getSyncStatus: () => ({ lastSyncTime: Date.now() - 60000 }),
        },
    },
    {
        provide: AuthService,
        useValue: {
            signInWithGoogle: async () => {},
        },
    },
];

const meta: Meta<FooterComponent> = {
    title: 'Layout/FooterComponent',
    component: FooterComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: mockStores,
        }),
    ],
};

export default meta;
type Story = StoryObj<FooterComponent>;

export const Default: Story = {};
