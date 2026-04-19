import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AuthService } from '../../services/auth/auth.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SyncService } from '../../services/sync/sync.service';
import { FooterComponent } from '../layout/footer/footer.component';
import { HeaderComponent } from '../layout/header/header.component';
import { SecurityOverlayComponent } from '../layout/security-overlay/security-overlay.component';

@Component({
    selector: 'combo-security-session',
    standalone: true,
    imports: [HeaderComponent, FooterComponent, SecurityOverlayComponent],
    template: `
        <div class="h-screen bg-black text-white flex flex-col font-sans overflow-hidden relative">
            <header
                class="border-b border-white/10 bg-black/50 backdrop-blur-xl shrink-0 z-40"
            ></header>

            <main class="flex-1 p-8">
                <!-- Mock sensitive data that should be blurred -->
                <div class="max-w-4xl mx-auto space-y-6">
                    <h1 class="text-3xl font-bold">Net Worth</h1>
                    <div class="text-6xl font-light">$1,245,678.90</div>

                    <div class="grid grid-cols-2 gap-6 mt-12">
                        <div class="p-6 border border-white/10 rounded-xl bg-white/5">
                            <div class="text-white/60 mb-2">Chase Checking (...1234)</div>
                            <div class="text-2xl">$12,450.00</div>
                        </div>
                        <div class="p-6 border border-white/10 rounded-xl bg-white/5">
                            <div class="text-white/60 mb-2">Amex Platinum (...8888)</div>
                            <div class="text-2xl text-red-400">-$4,200.00</div>
                        </div>
                    </div>
                </div>
            </main>

            <footer class="border-t border-white/10 bg-black/80 shrink-0"></footer>

            <!-- The blur overlay applied when session goes idle -->
            <security-overlay
                [isVisible]="isIdle()"
                (unlocked)="isIdle.set(false)"
            ></security-overlay>

            @if (!isIdle()) {
                <button
                    (click)="isIdle.set(true)"
                    class="absolute bottom-16 right-8 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 z-50"
                >
                    Simulate Idle Timeout
                </button>
            }
        </div>
    `
})
export class ComboSecuritySessionComponent {
    isIdle = signal(true);
}

// Mocks for header/footer layout components
const mockLedgerStore = {
    transactions: signal([]),
    accounts: signal([]),
    syncStatus: signal('idle'),
    authError: signal(false),
    hasLocalFallback: signal(true)
};
const mockAuthService = {
    currentUser: signal({ displayName: 'Protected User', email: 'secure@example.com' })
};
const mockSyncService = {
    isSyncing: signal(false),
    getSyncStatus: () => ({ lastSyncTime: Date.now() })
};

const meta: Meta<ComboSecuritySessionComponent> = {
    title: 'Combo Compositions/7. Security Session',
    component: ComboSecuritySessionComponent,
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
type Story = StoryObj<ComboSecuritySessionComponent>;

export const IdleAppScreenshot: Story = {};
