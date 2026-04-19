import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import { AuthService } from '../../services/auth/auth.service';
import { FirebaseService } from '../../services/firebase/firebase.service';
import { SignInComponent } from './sign-in.component';

/**
 * Mock AuthService that allows us to control the loading/error states
 * without actually hitting Firebase during Storybook rendering.
 */
class MockAuthService {
    async signInWithGoogle(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 800));
    }
}

class MockAuthServiceError {
    async signInWithGoogle(): Promise<void> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Firebase: Error (auth/popup-closed-by-user).'));
            }, 800);
        });
    }
}

class MockAuthServiceNetworkError {
    async signInWithGoogle(): Promise<void> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Firebase: Error (auth/network-request-failed).'));
            }, 800);
        });
    }
}

const meta: Meta<SignInComponent> = {
    title: 'Auth/SignInComponent',
    component: SignInComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                // Provide a dummy FirebaseService just in case
                { provide: FirebaseService, useValue: {} }
            ]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<SignInComponent>;

/**
 * The standard sign-in page state.
 */
export const Default: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: AuthService, useClass: MockAuthService }]
        })
    ]
};

/**
 * Simulates a user clicking the sign-in button and waiting for the popup.
 */
export const InteractiveLogin: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: AuthService, useClass: MockAuthService }]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const button = canvas.getByRole('button', { name: /continue with google/i });
        await userEvent.click(button);
        // Verify loading state appears
        await expect(canvas.getByText(/authenticating/i)).toBeInTheDocument();
        // Wait for it to finish (MockAuthService takes 800ms)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
};

/**
 * State shown when the user closes the Google sign-in popup.
 */
export const PopupClosedError: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: AuthService, useClass: MockAuthServiceError }]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        // Wait for error to appear
        await new Promise(resolve => setTimeout(resolve, 1000));
        await expect(canvas.getByText(/sign-in cancelled/i)).toBeInTheDocument();
    }
};

/**
 * State shown when there is a network error during sign-in.
 */
export const NetworkError: Story = {
    decorators: [
        applicationConfig({
            providers: [{ provide: AuthService, useClass: MockAuthServiceNetworkError }]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        await new Promise(resolve => setTimeout(resolve, 1000));
        await expect(canvas.getByText(/network error/i)).toBeInTheDocument();
    }
};
