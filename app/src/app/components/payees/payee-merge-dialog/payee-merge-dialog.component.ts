import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IPayee, IRecurringSchedule } from '@core';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Accessible Modal Dialog for merging two payees.
 * Reassigns all transactions and recurring schedules from the duplicate payee
 * to the master payee and removes the duplicate payee.
 */
@Component({
    selector: 'payee-merge-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './payee-merge-dialog.component.html',
    styleUrl: './payee-merge-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayeeMergeDialogComponent {
    private readonly ledgerStore = inject(LedgerStore);

    /** Two-way visibility state */
    readonly isOpen = model<boolean>(false);

    /** Optional pre-selected source payee ID */
    readonly initialSourcePayeeId = input<string | null>(null);

    /** Emitted when merge successfully completes */
    readonly merged = output<{
        sourceId: string;
        targetId: string;
        affectedTransactions: number;
        affectedSchedules: number;
    }>();

    readonly payees = this.ledgerStore.payees;
    readonly transactions = this.ledgerStore.transactions;
    readonly schedules = this.ledgerStore.schedules;

    // Form selection signals
    readonly sourcePayeeId = signal<string>('');
    readonly targetPayeeId = signal<string>('');
    readonly isMerging = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    constructor() {
        effect(() => {
            const initial = this.initialSourcePayeeId();
            if (initial) {
                this.sourcePayeeId.set(initial);
            }
        });
    }

    readonly selectedSourcePayee = computed<IPayee | undefined>(() => {
        const id = this.sourcePayeeId();
        return this.payees().find(p => p.id === id);
    });

    readonly selectedTargetPayee = computed<IPayee | undefined>(() => {
        const id = this.targetPayeeId();
        return this.payees().find(p => p.id === id);
    });

    readonly availableTargets = computed<Array<IPayee>>(() => {
        const sourceId = this.sourcePayeeId();
        return this.payees().filter(p => p.id !== sourceId);
    });

    readonly affectedTransactionCount = computed<number>(() => {
        const sourceId = this.sourcePayeeId();
        if (!sourceId) return 0;
        return this.transactions().filter(t => t.payeeId === sourceId).length;
    });

    readonly affectedScheduleCount = computed<number>(() => {
        const source = this.selectedSourcePayee();
        if (!source) return 0;
        return this.schedules().filter(
            (s: IRecurringSchedule): boolean => s.payee === source.name || s.payee === source.id
        ).length;
    });

    readonly canMerge = computed<boolean>(() => {
        const s = this.sourcePayeeId();
        const t = this.targetPayeeId();
        return Boolean(s && t && s !== t && !this.isMerging());
    });

    close(): void {
        this.isOpen.set(false);
        this.error.set(null);
        this.isMerging.set(false);
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('merge-modal-backdrop')) {
            this.close();
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    async confirmMerge(): Promise<void> {
        const sourceId = this.sourcePayeeId();
        const targetId = this.targetPayeeId();

        if (!sourceId || !targetId || sourceId === targetId) {
            this.error.set('Please select two distinct payees to merge.');
            return;
        }

        try {
            this.isMerging.set(true);
            this.error.set(null);

            const result = await this.ledgerStore.mergePayees(sourceId, targetId);

            this.merged.emit({
                sourceId,
                targetId,
                affectedTransactions: result.affectedTransactions,
                affectedSchedules: result.affectedSchedules
            });

            this.close();
        } catch (err: unknown) {
            this.error.set(
                err instanceof Error ? err.message : 'An error occurred while merging payees.'
            );
        } finally {
            this.isMerging.set(false);
        }
    }
}
