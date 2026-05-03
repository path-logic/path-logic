import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IPayee } from '@core';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { PayeeEditDialogComponent } from '../../components/payees/payee-edit-dialog/payee-edit-dialog.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

/**
 * Page for managing the Payee directory.
 * Provides search, filtering, add, and edit capabilities for each payee.
 */
@Component({
    selector: 'payees-page',
    standalone: true,
    imports: [CommonModule, FormsModule, AppShellComponent, PayeeEditDialogComponent],
    templateUrl: './payees-page.component.html',
    styleUrls: ['./payees-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayeesPageComponent {
    private readonly ledgerStore = inject(LedgerStore);

    // State
    readonly expandedId = signal<string | null>(null);
    readonly searchQuery = signal<string>('');

    // Dialog state
    readonly isDialogOpen = signal<boolean>(false);
    readonly selectedPayee = signal<IPayee | null>(null);

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
        this.selectedPayee.set(null);
        this.isDialogOpen.set(true);
    }

    openEditPayee(payee: IPayee): void {
        this.selectedPayee.set(payee);
        this.isDialogOpen.set(true);
    }

    handlePayeeSaved(_payee: IPayee): void {
        // The store already refreshed via the updatePayee/getOrCreatePayee call
        // inside the dialog. Just close any expanded row.
        this.expandedId.set(null);
    }

    // Lucide Icons
}
