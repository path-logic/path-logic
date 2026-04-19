import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    ChevronDown,
    ChevronRight,
    FileText,
    Globe,
    LucideAngularModule,
    MapPin,
    Phone,
    Plus,
    Search,
    User
} from 'lucide-angular';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

/**
 * Page for managing the Payee directory.
 * Provides search, filtering, and detailed views for each payee.
 */
@Component({
    selector: 'payees-page',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, AppShellComponent],
    templateUrl: './payees-page.component.html',
    styleUrls: ['./payees-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayeesPageComponent {
    private readonly ledgerStore = inject(LedgerStore);

    // State
    readonly expandedId = signal<string | null>(null);
    readonly searchQuery = signal<string>('');

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

    // Lucide Icons
    readonly Plus = Plus;
    readonly ChevronDown = ChevronDown;
    readonly ChevronRight = ChevronRight;
    readonly User = User;
    readonly MapPin = MapPin;
    readonly Globe = Globe;
    readonly Phone = Phone;
    readonly FileText = FileText;
    readonly Search = Search;
}
