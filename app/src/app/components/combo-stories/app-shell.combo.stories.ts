import { Component, signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { BreadcrumbNavComponent } from '../layout/breadcrumb-nav/breadcrumb-nav.component';
import { FooterComponent } from '../layout/footer/footer.component';
import { HeaderComponent } from '../layout/header/header.component';

/**
 * A wrapper component that composes the full app shell exactly as it will
 * appear in the real application layout.
 */
@Component({
    selector: 'combo-shell',
    standalone: true,
    imports: [HeaderComponent, FooterComponent, BreadcrumbNavComponent],
    template: `
        <div
            class="h-screen bg-black text-white flex flex-col font-sans overflow-hidden antialiased selection:bg-primary/30"
        >
            <!-- Header -->
            <header
                class="border-b border-white/10 bg-black/50 backdrop-blur-xl shrink-0 z-40"
            ></header>

            <!-- Breadcrumb Navigation -->
            <breadcrumb-nav class="shrink-0"></breadcrumb-nav>

            <!-- Main Content Area -->
            <main class="flex-1 overflow-auto relative" tabindex="0" aria-label="Main content">
                <div class="p-6 max-w-7xl mx-auto">
                    <h1 class="text-3xl font-bold tracking-tight mb-4">Dashboard</h1>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div
                            class="h-64 rounded-xl border border-white/10 bg-white/5 animate-pulse"
                        ></div>
                        <div
                            class="h-64 rounded-xl border border-white/10 bg-white/5 animate-pulse md:col-span-2"
                        ></div>
                        <div
                            class="h-96 rounded-xl border border-white/10 bg-white/5 animate-pulse md:col-span-3"
                        ></div>
                    </div>
                </div>
            </main>

            <!-- Footer -->
            <footer class="border-t border-white/10 bg-black/80 shrink-0"></footer>
        </div>
    `
})
export class ComboShellComponent {}

// Mocks for all the injected services required by the composed components
const mockLedgerStore = {
    transactions: signal([]),
    accounts: signal([]),
    schedules: signal([]),
    payees: signal([]),
    syncStatus: signal('idle'),
    authError: signal(false),
    isInitialized: signal(true),
    hasLocalFallback: signal(true)
};

const mockAuthService = {
    currentUser: signal({ displayName: 'Demo User', email: 'demo@example.com' })
};

const mockSyncService = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const meta: Meta<ComboShellComponent> = {
    title: 'Combo Compositions/1. Full App Shell',
    component: ComboShellComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<ComboShellComponent>;

export const DefaultDashboardLayout: Story = {};
