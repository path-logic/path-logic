import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { PostHogService } from '../../services/posthog/posthog.service';

/**
 * Premium sign-in page for Google SSO authentication.
 */
@Component({
    selector: 'sign-in',
    standalone: true,
    imports: [],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
    private readonly authService: AuthService = inject(AuthService);
    private readonly router: Router = inject(Router);
    private readonly posthogService: PostHogService = inject(PostHogService);

    readonly isLoading = signal<boolean>(false);
    readonly signInError = signal<string | null>(null);

    async signInWithGoogle(): Promise<void> {
        this.isLoading.set(true);
        this.signInError.set(null);
        this.posthogService.posthog.capture('sign_in_attempted', { provider: 'google' });

        try {
            await this.authService.signInWithGoogle();
            // onAuthStateChanged fires → navigation effect in AuthService navigates to /
        } catch (error: unknown) {
            const message: string =
                error instanceof Error ? error.message : 'An unexpected error occurred.';

            let userMessage = message;
            let errorType = 'unknown';

            if (
                message.includes('popup-closed-by-user') ||
                message.includes('cancelled-popup-request')
            ) {
                userMessage = 'Sign-in cancelled. Please try again.';
                errorType = 'popup_closed';
            } else if (message.includes('popup-blocked')) {
                userMessage =
                    'Pop-up was blocked. Please allow pop-ups for this site and try again.';
                errorType = 'popup_blocked';
            } else if (message.includes('network-request-failed')) {
                userMessage = 'Network error. Please check your connection and try again.';
                errorType = 'network_error';
            }

            this.posthogService.posthog.capture('sign_in_failed', {
                provider: 'google',
                error_type: errorType,
                error_message: message
            });
            this.signInError.set(userMessage);
        } finally {
            this.isLoading.set(false);
        }
    }
}
