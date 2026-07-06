import { Component, signal } from '@angular/core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { SignInComponent } from '../../pages/sign-in/sign-in.component';
import { AuthService } from '../../services/auth/auth.service';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { AuthOverlayComponent } from '../auth/auth-overlay/auth-overlay.component';

@Component({
    selector: 'combo-auth-flow',
    standalone: true,
    imports: [SignInComponent, AuthOverlayComponent],
    template: `
        <!-- Main background representing the app router outlet -->
        <div class="h-screen bg-black w-full relative p-8">
            <h1 class="text-white text-2xl font-bold mb-8">Authentication Flow Simulator</h1>
            <sign-in></sign-in>

            <!-- The overlay sits at the root level in the real app -->
            <auth-overlay></auth-overlay>
        </div>
    `
})
export class ComboAuthFlowComponent {}

// Mock AuthService that throws an error to trigger the overlay gracefully
const isInitialRender = true;
class MockAuthService {
    async signInWithGoogle(): Promise<void> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Firebase: Error (auth/popup-closed-by-user).'));
            }, 800);
        });
    }
}

// Mock LedgerStore with an auth error signal that toggles for the overlay
const mockLedgerStore = {
    authError: signal(true),
    isInitialized: signal(false),
    hasLocalFallback: signal(false)
};

const meta: Meta<ComboAuthFlowComponent> = {
    title: 'Combo Compositions/2. Auth Flow',
    component: ComboAuthFlowComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: [
                { provide: AuthService, useClass: MockAuthService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: FirebaseService, useValue: {} }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<ComboAuthFlowComponent>;

export const AuthErrorOverlayInterruption: Story = {};
