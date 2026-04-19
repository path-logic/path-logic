import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Cloud, Lock, LucideAngularModule, ShieldCheck } from 'lucide-angular';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Full-page overlay for forced re-authentication.
 * Used when the session is expired and there is no local fallback to work with.
 */
@Component({
    selector: 'auth-overlay',
    standalone: true,
    imports: [LucideAngularModule],
    templateUrl: './auth-overlay.component.html',
    styleUrl: './auth-overlay.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthOverlayComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);

    readonly LockIcon = Lock;
    readonly CloudIcon = Cloud;
    readonly ShieldCheckIcon = ShieldCheck;

    /**
     * Computed signal that determines if the overlay should be visible.
     */
    readonly showOverlay = computed((): boolean => {
        const authError: boolean = this.ledgerStore.authError();
        const isInitialized: boolean = this.ledgerStore.isInitialized();
        const hasLocalFallback: boolean = this.ledgerStore.hasLocalFallback();

        // We only show the full-page overlay if we can't initialize at all due to auth error
        return authError && !isInitialized && !hasLocalFallback;
    });

    /**
     * Initiates the Google login flow.
     */
    handleLogin(): void {
        void this.authService.signInWithGoogle();
    }
}
