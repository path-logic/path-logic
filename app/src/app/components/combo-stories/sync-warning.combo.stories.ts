import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { SyncPendingBannerComponent } from '../auth/sync-pending-banner/sync-pending-banner.component';
import { FooterComponent } from '../layout/footer/footer.component';
import { HeaderComponent } from '../layout/header/header.component';

@Component({
    selector: 'combo-sync-warning',
    standalone: true,
    imports: [HeaderComponent, FooterComponent, SyncPendingBannerComponent],
    template: `
        <div class="h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
            <!-- App Banner injected at the very top (similar to root layout) -->
            <sync-pending-banner></sync-pending-banner>

            <header
                class="border-b border-white/10 bg-black/50 backdrop-blur-xl shrink-0 z-40"
            ></header>

            <main class="flex-1 p-8 relative">
                <div class="max-w-3xl mx-auto text-center mt-20">
                    <div
                        class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6"
                    >
                        <i class="lucide-wifi-off w-10 h-10 text-red-500"></i>
                    </div>
                    <h1 class="text-3xl font-bold mb-4">You are working offline</h1>
                    <p class="text-xl text-white/60 mb-8 max-w-xl mx-auto">
                        Your session has expired. The application is allowing you to continue making
                        local changes, but they will not be securely synced to your cloud drive
                        until you reconnect.
                    </p>
                    <button
                        class="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90"
                    >
                        Continue Local Editing
                    </button>
                </div>
            </main>

            <!-- Expected to show the Sync Error status -->
            <footer class="border-t border-white/10 bg-black/80 shrink-0"></footer>
        </div>
    `
})
export class ComboSyncWarningComponent {}

// Force LedgerStore into the "auth disabled, local fallback active" state
const mockLedgerStore = {
    transactions: signal([]),
    accounts: signal([]),
    syncStatus: signal('pending-local'),
    authError: signal(true),
    isDirty: signal(true),
    hasLocalFallback: signal(true)
};

const mockAuthService = {
    currentUser: signal({ displayName: 'Disconnected User', email: 'user@example.com' }),
    signInWithGoogle: async () => console.log('Mock sign in')
};

const mockSyncService = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() - 86400000 }) // Yesterday
};

const meta: Meta<ComboSyncWarningComponent> = {
    title: 'Combo Compositions/6. Sync Warning State',
    component: ComboSyncWarningComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<ComboSyncWarningComponent>;

export const LocalFallbackMode: Story = {};
