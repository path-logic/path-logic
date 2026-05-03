import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Prominent sync-pending banner.
 *
 * Shown whenever the app is in local-only mode (no Drive token).
 * Designed to be highly visible — the user MUST notice that their
 * data is not syncing to the cloud.
 *
 * Visibility rule: authError is true AND syncStatus is 'pending-local'.
 * Once the user re-authenticates and Drive sync resumes, the banner disappears.
 */
@Component({
    selector: 'sync-pending-banner',
    standalone: true,
    imports: [],
    templateUrl: './sync-pending-banner.component.html',
    styleUrl: './sync-pending-banner.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncPendingBannerComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);

    readonly showBanner = computed((): boolean => {
        return this.ledgerStore.authError() && this.ledgerStore.syncStatus() === 'pending-local';
    });

    async reAuthenticate(): Promise<void> {
        try {
            await this.authService.signInWithGoogle();
            // Clear authError — the AppComponent effect will trigger a Drive sync
            this.ledgerStore.authError.set(false);
        } catch {
            // User dismissed the popup — keep banner visible
        }
    }
}
