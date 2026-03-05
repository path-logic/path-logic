import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AlertTriangle, LucideAngularModule } from 'lucide-angular';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Mid-session warning banner for when sync is purely local due to authentication issues.
 */
@Component({
    selector: 'app-sync-pending-banner',
    standalone: true,
    imports: [LucideAngularModule],
    templateUrl: './sync-pending-banner.component.html',
    styleUrl: './sync-pending-banner.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncPendingBannerComponent {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);

    readonly AlertTriangleIcon = AlertTriangle;

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
