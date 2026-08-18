import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { IPayee } from '@core';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { PayeeEditDialogComponent } from '../../components/payees/payee-edit-dialog/payee-edit-dialog.component';
import { PayeeMergeDialogComponent } from '../../components/payees/payee-merge-dialog/payee-merge-dialog.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

/**
 * Page for managing the Payee directory.
 * Provides search, filtering, add, edit, and merge capabilities for each payee.
 */
@Component({
    selector: 'payees-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AppShellComponent,
        PayeeEditDialogComponent,
        PayeeMergeDialogComponent
    ],
    templateUrl: './payees-page.component.html',
    styleUrls: ['./payees-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayeesPageComponent {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly router = inject(Router);

    // State
    readonly expandedId = signal<string | null>(null);
    readonly searchQuery = signal<string>('');

    // Edit Dialog state
    readonly isDialogOpen = signal<boolean>(false);
    readonly selectedPayee = signal<IPayee | null>(null);

    // Merge Dialog state
    readonly isMergeDialogOpen = signal<boolean>(false);
    readonly preselectedMergeSourceId = signal<string | null>(null);

    // Store Signals
    readonly payees = this.ledgerStore.payees;

    // Computed
    readonly filteredPayees = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const allPayees = this.payees();

        if (!query) return allPayees;

        return allPayees.filter(
            p =>
                p.name.toLowerCase().includes(query) ||
                (p.city && p.city.toLowerCase().includes(query)) ||
                (p.notes && p.notes.toLowerCase().includes(query))
        );
    });

    toggleExpand(payeeId: string): void {
        this.expandedId.update(id => (id === payeeId ? null : payeeId));
    }

    openAddPayee(): void {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            void this.router.navigate(['/payees/new']);
        } else {
            this.selectedPayee.set(null);
            this.isDialogOpen.set(true);
        }
    }

    openEditPayee(payee: IPayee): void {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            void this.router.navigate(['/payees', payee.id, 'edit']);
        } else {
            this.selectedPayee.set(payee);
            this.isDialogOpen.set(true);
        }
    }

    openMergePayees(sourceId?: string): void {
        this.preselectedMergeSourceId.set(sourceId ?? null);
        this.isMergeDialogOpen.set(true);
    }

    handlePayeeSaved(_payee: IPayee): void {
        this.expandedId.set(null);
    }

    handlePayeesMerged(): void {
        this.expandedId.set(null);
    }
}
