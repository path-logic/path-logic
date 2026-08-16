import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';

@Component({
    selector: 'drive-reauth-banner',
    standalone: true,
    imports: [],
    template: `
        @if (isVisible()) {
            <div
                class="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium sticky top-0 z-[70] backdrop-blur-md"
            >
                <div class="flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle text-amber-500 text-sm"></i>
                    <span>
                        Google Drive access token expired. Syncing is paused until re-authenticated.
                    </span>
                </div>
                <button
                    type="button"
                    (click)="reauthenticate()"
                    class="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-3 py-1.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                >
                    Re-authenticate Drive
                </button>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriveReauthBannerComponent {
    private readonly authService = inject(AuthService);
    private readonly syncService = inject(SyncService);
    private readonly ledgerStore = inject(LedgerStore);

    readonly isVisible = computed(
        () => this.ledgerStore.authError() || !this.authService.accessToken()
    );

    async reauthenticate(): Promise<void> {
        try {
            await this.authService.signInWithGoogle();
            this.ledgerStore.authError.set(false);
            await this.syncService.syncFromDrive();
        } catch (error) {
            console.error('[DriveReauthBanner] Failed to re-authenticate:', error);
        }
    }
}
