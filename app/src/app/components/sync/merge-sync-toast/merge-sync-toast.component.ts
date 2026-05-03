import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Auto-dismissing toast that appears after a background Drive sync merges
 * new transactions from another device.
 *
 * Visibility: mergeCount > 0 (set by SyncService after a successful merge).
 * Auto-dismisses after 6 seconds. Dismissed immediately when mergeCount
 * drops back to 0 or the user clicks the close button.
 *
 * If there are pending conflicts, shows a "Review conflicts" CTA that
 * the conflict modal will pick up via syncConflicts signal.
 */
@Component({
    selector: 'merge-sync-toast',
    standalone: true,
    imports: [],
    templateUrl: './merge-sync-toast.component.html',
    styleUrl: './merge-sync-toast.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MergeSyncToastComponent {
    private readonly ledgerStore = inject(LedgerStore);

    readonly mergeCount = computed(() => this.ledgerStore.mergeCount());
    readonly hasConflicts = computed(() => this.ledgerStore.syncConflicts().length > 0);
    readonly conflictCount = computed(() => this.ledgerStore.syncConflicts().length);

    /** Controls local visibility (separate from mergeCount for dismiss animation) */
    readonly visible = signal<boolean>(false);

    private dismissTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        // Show toast whenever mergeCount changes to a positive value
        effect(() => {
            const count = this.mergeCount();
            if (count > 0) {
                this.visible.set(true);
                this.scheduleDismiss();
            }
        });
    }

    dismiss(): void {
        if (this.dismissTimer !== null) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
        this.visible.set(false);
        // Reset merge count so the toast can show again on next sync
        this.ledgerStore.mergeCount.set(0);
    }

    private scheduleDismiss(): void {
        if (this.dismissTimer !== null) clearTimeout(this.dismissTimer);
        this.dismissTimer = setTimeout(() => {
            this.dismiss();
        }, 6000);
    }
}
