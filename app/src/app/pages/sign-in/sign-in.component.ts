import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Cloud, Loader2, Lock, LucideAngularModule, Shield } from 'lucide-angular';

import { AuthService } from '../../services/auth/auth.service';

/**
 * Premium sign-in page for Google SSO authentication.
 * Full-page dark layout with animated logo, trust signals, and error handling.
 */
@Component({
    selector: 'app-sign-in',
    standalone: true,
    imports: [LucideAngularModule],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
    private readonly authService: AuthService = inject(AuthService);
    private readonly router: Router = inject(Router);

    readonly ShieldIcon = Shield;
    readonly CloudIcon = Cloud;
    readonly LockIcon = Lock;
    readonly Loader2Icon = Loader2;

    /** Whether the sign-in process is currently in progress. */
    readonly isLoading = signal<boolean>(false);

    /** Error message to display if sign-in fails. */
    readonly signInError = signal<string | null>(null);

    /**
     * Initiates the Google sign-in flow via Firebase Auth.
     * On success, navigates to the dashboard.
     */
    async signInWithGoogle(): Promise<void> {
        this.isLoading.set(true);
        this.signInError.set(null);

        try {
            await this.authService.signInWithGoogle();
            await this.router.navigate(['/']);
        } catch (error: unknown) {
            const message: string =
                error instanceof Error ? error.message : 'An unexpected error occurred.';

            // Provide user-friendly messages for common Firebase Auth errors
            if (message.includes('popup-closed-by-user')) {
                this.signInError.set('Sign-in cancelled. Please try again.');
            } else if (message.includes('popup-blocked')) {
                this.signInError.set(
                    'Pop-up was blocked by your browser. Please allow pop-ups for this site.',
                );
            } else if (message.includes('network-request-failed')) {
                this.signInError.set('Network error. Please check your connection and try again.');
            } else {
                this.signInError.set(message);
            }
        } finally {
            this.isLoading.set(false);
        }
    }
}
