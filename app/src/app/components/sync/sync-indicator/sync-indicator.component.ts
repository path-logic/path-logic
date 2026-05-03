import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { TimerHandle } from '@core';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';

/**
 * Global indicator for Google Drive sync status.
 * Visualizes when the app is in-progress, idle, or has encountered an error.
 */
@Component({
    selector: 'sync-indicator',
    standalone: true,
    imports: [],
    templateUrl: './sync-indicator.component.html',
    styleUrl: './sync-indicator.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncIndicatorComponent implements OnInit, OnDestroy {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly syncService: SyncService = inject(SyncService);
    private readonly authService: AuthService = inject(AuthService);

    private pollInterval: TimerHandle | null = null;
    readonly lastSyncTime = signal<number>(0);

    readonly syncStatus = this.ledgerStore.syncStatus;
    readonly authError = this.ledgerStore.authError;
    readonly hasLocalFallback = this.ledgerStore.hasLocalFallback;
    readonly isSyncing = this.syncService.isSyncing;

    readonly statusLabel = computed((): string => {
        const currentStatus: string = this.syncStatus();
        if (currentStatus === 'error') return 'Sync Error';
        if (currentStatus === 'pending-local') return 'Local Only';
        if (this.isSyncing()) return 'Active...';
        return 'Idle';
    });

    readonly lastSyncFormatted = computed((): string | null => {
        const time: number = this.lastSyncTime();
        if (time <= 0) return null;
        return new Date(time).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    });

    ngOnInit(): void {
        this.pollInterval = setInterval((): void => {
            const status = this.syncService.getSyncStatus();
            this.lastSyncTime.set(status.lastSyncTime);
        }, 500);
    }

    ngOnDestroy(): void {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }

    /**
     * Initiates the Google Drive reconnection flow.
     */
    handleReconnect(): void {
        void this.authService.signInWithGoogle();
    }
}
