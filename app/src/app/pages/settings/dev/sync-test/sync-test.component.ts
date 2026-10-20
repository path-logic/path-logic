import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';
import type { ITransactionConflict } from '../../../../lib/sync/MergeEngine';
import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../../services/sync/sync.service';

/**
 * Sync Test Suite & Architectural Diagnostic Console.
 * Validates SQLite -> AES-GCM-256 -> Google Drive synchronization,
 * conflict generation, and offline simulation.
 */
@Component({
    selector: 'sync-test',
    standalone: true,
    imports: [CommonModule, RouterLink, AppShellComponent],
    templateUrl: './sync-test.component.html',
    styleUrls: ['./sync-test.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncTestComponent {
    private readonly syncService: SyncService = inject(SyncService);
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly authService: AuthService = inject(AuthService);

    // Reactive State from Store & Services
    readonly syncStatus = this.ledgerStore.syncStatus;
    readonly syncError = this.ledgerStore.syncError;
    readonly conflicts = this.ledgerStore.syncConflicts;
    readonly isSyncing = this.syncService.isSyncing;
    readonly currentUser = this.authService.currentUser;
    readonly hasDriveToken = signal<boolean>(true);

    // Simulation Signals
    readonly simulatedNetworkOnline = signal<boolean>(true);
    readonly lastTriggeredAction = signal<string | null>(null);

    /**
     * Trigger immediate save/upload to Drive.
     */
    async triggerImmediateSync(): Promise<void> {
        this.lastTriggeredAction.set('immediate-sync');
        await this.syncService.saveToDrive(true);
    }

    /**
     * Trigger full download and merge check from Google Drive.
     */
    async triggerDriveSync(): Promise<void> {
        this.lastTriggeredAction.set('drive-sync');
        await this.syncService.syncFromDrive();
    }

    /**
     * Generate a simulated transaction conflict between local and remote versions.
     */
    simulateConflict(): void {
        const id = `tx-conflict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newConflict: ITransactionConflict = {
            id,
            mine: {
                date: '2026-02-15',
                payee: 'Local Roaster (Mine)',
                totalAmount: -450,
                memo: 'Local updated note',
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'payee-1',
                importHash: null,
                updatedAt: new Date().toISOString()
            },
            theirs: {
                date: '2026-02-15',
                payee: 'Local Roaster (Drive)',
                totalAmount: -525,
                memo: 'Remote mobile note',
                status: 'cleared',
                checkNumber: null,
                accountId: 'acc-1',
                payeeId: 'payee-1',
                importHash: null,
                updatedAt: new Date().toISOString()
            }
        };

        this.ledgerStore.syncConflicts.update((curr: Array<ITransactionConflict>) => [
            ...curr,
            newConflict
        ]);
        this.lastTriggeredAction.set('simulate-conflict');
    }

    /**
     * Clear all current unresolved conflicts.
     */
    clearConflicts(): void {
        this.ledgerStore.syncConflicts.set([]);
        this.lastTriggeredAction.set('clear-conflicts');
    }

    /**
     * Resolve an active conflict by selecting either local (mine) or remote (theirs).
     */
    async resolveConflict(conflictId: string, keepMine: boolean): Promise<void> {
        this.lastTriggeredAction.set(`resolve-conflict-${keepMine ? 'mine' : 'theirs'}`);
        await this.ledgerStore.resolveConflict(conflictId, keepMine);
    }

    /**
     * Simulate toggling network connectivity between online and offline.
     */
    toggleNetworkStatus(): void {
        const nextState = !this.simulatedNetworkOnline();
        this.simulatedNetworkOnline.set(nextState);

        if (!nextState) {
            this.ledgerStore.syncStatus.set('pending-local');
            this.lastTriggeredAction.set('network-offline');
        } else {
            this.ledgerStore.syncStatus.set('synced');
            this.lastTriggeredAction.set('network-online');
        }
    }

    /**
     * Simulate a synchronization failure error state.
     */
    simulateSyncError(message: string = 'Simulated 503 Service Unavailable'): void {
        this.ledgerStore.syncStatus.set('error');
        this.ledgerStore.syncError.set(message);
        this.lastTriggeredAction.set('simulate-error');
    }

    /**
     * Reset simulated error state back to clean synced status.
     */
    resetSyncState(): void {
        this.ledgerStore.syncStatus.set('synced');
        this.ledgerStore.syncError.set(null);
        this.lastTriggeredAction.set('reset-state');
    }
}
