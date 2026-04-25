import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideAngularModule, AlertTriangle, Check, X, GitMerge, Monitor, Cloud } from 'lucide-angular';

import type { ITransactionConflict } from '../../../lib/sync/MergeEngine';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Modal for resolving true sync conflicts — transactions modified on BOTH
 * the local device AND another device since the last Drive sync.
 *
 * Shown when syncConflicts().length > 0. The user resolves each conflict by
 * choosing "Keep Mine" (local) or "Keep Theirs" (remote from Drive). After all
 * conflicts are resolved the modal disappears and the ledger triggers a Drive upload.
 */
@Component({
    selector: 'conflict-resolution-modal',
    standalone: true,
    imports: [LucideAngularModule],
    templateUrl: './conflict-resolution-modal.component.html',
    styleUrl: './conflict-resolution-modal.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConflictResolutionModalComponent {
    private readonly ledgerStore = inject(LedgerStore);

    readonly AlertTriangle = AlertTriangle;
    readonly Check = Check;
    readonly X = X;
    readonly GitMerge = GitMerge;
    readonly Monitor = Monitor;
    readonly Cloud = Cloud;

    readonly conflicts = computed(() => this.ledgerStore.syncConflicts());
    readonly showModal = computed(() => this.conflicts().length > 0);

    formatAmount(cents: number): string {
        const sign = cents < 0 ? '-' : '';
        return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
    }

    formatDate(dateStr: string): string {
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    formatTimestamp(iso: string): string {
        try {
            return new Date(iso).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        } catch {
            return iso;
        }
    }

    keepMine(conflict: ITransactionConflict): void {
        this.ledgerStore.resolveConflict(conflict.id, true).catch(console.error);
    }

    keepTheirs(conflict: ITransactionConflict): void {
        this.ledgerStore.resolveConflict(conflict.id, false).catch(console.error);
    }

    keepAllMine(): void {
        const ids = this.conflicts().map(c => c.id);
        for (const id of ids) {
            this.ledgerStore.resolveConflict(id, true).catch(console.error);
        }
    }

    keepAllTheirs(): void {
        const ids = this.conflicts().map(c => c.id);
        for (const id of ids) {
            this.ledgerStore.resolveConflict(id, false).catch(console.error);
        }
    }
}
