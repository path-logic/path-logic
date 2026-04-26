import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Cloud, Loader2, Lock, LucideAngularModule, Shield } from 'lucide-angular';

import { AuthService } from '../../services/auth/auth.service';
import { PostHogService } from '../../services/posthog/posthog.service';

/**
 * Premium sign-in page for Google SSO authentication.
 * Full-page dark layout with animated logo, trust signals, and error handling.
 *
 * Uses the redirect flow (signInWithRedirect) — the browser navigates away to
 * Google when the button is clicked, then returns to the app. No popup = no
 * COOP errors.
 */
@Component({
    selector: 'sign-in',
    standalone: true,
    imports: [LucideAngularModule],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
    private readonly authService: AuthService = inject(AuthService);
    private readonly router: Router = inject(Router);
    private readonly posthogService: PostHogService = inject(PostHogService);

    readonly ShieldIcon = Shield;
    readonly CloudIcon = Cloud;
    readonly LockIcon = Lock;
    readonly Loader2Icon = Loader2;

    /** True while the redirect is initiating (spinner shown). */
    readonly isLoading = signal<boolean>(false);

    /** Error message shown only if the redirect itself fails (rare). */
    readonly signInError = signal<string | null>(null);

    /**
     * Initiates the Google sign-in redirect flow via Firebase Auth.
     * The browser navigates away to accounts.google.com — this method
     * only returns/throws on an error before the redirect starts.
     */
    async signInWithGoogle(): Promise<void> {
        this.isLoading.set(true);
        this.signInError.set(null);
        this.posthogService.posthog.capture('sign_in_attempted', { provider: 'google' });

        try {
            await this.authService.signInWithGoogle();
            // On success the browser navigates away — we never reach here
        } catch (error: unknown) {
            // Only fires if the redirect initiation fails (e.g. network error)
            const message: string =
                error instanceof Error ? error.message : 'An unexpected error occurred.';

            if (message.includes('network-request-failed')) {
                this.posthogService.posthog.capture('sign_in_failed', {
                    provider: 'google',
                    error_type: 'network_error'
                });
                this.signInError.set('Network error. Please check your connection and try again.');
            } else {
                this.posthogService.posthog.capture('sign_in_failed', {
                    provider: 'google',
                    error_type: 'unknown',
                    error_message: message
                });
                this.signInError.set(message);
            }

            // Only reset loading on error — on success the browser navigates away
            this.isLoading.set(false);
        }
    }
}
