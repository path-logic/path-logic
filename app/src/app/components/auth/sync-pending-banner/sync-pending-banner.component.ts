import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Message } from 'primeng/message';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Mid-session warning banner for when sync is purely local due to authentication issues.
 */
@Component({
    selector: 'sync-pending-banner',
    standalone: true,
    imports: [Message],
    templateUrl: './sync-pending-banner.component.html',
    styleUrl: './sync-pending-banner.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncPendingBannerComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);

    /**
     * Computed signal that determines if the banner should be visible.
     */
    readonly showBanner = computed((): boolean => {
        const authError: boolean = this.ledgerStore.authError();
        const isDirty: boolean = this.ledgerStore.isDirty();
        const syncStatus: string = this.ledgerStore.syncStatus();

        // Show if we have unsynced data but the cloud connection is lost
        return authError && (isDirty || syncStatus === 'pending-local');
    });
}
