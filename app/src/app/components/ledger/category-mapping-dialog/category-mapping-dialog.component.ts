import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

@Component({
    selector: 'category-mapping-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, Dialog, Button, Select, PrimeTemplate],
    templateUrl: './category-mapping-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryMappingDialogComponent {
    readonly importService = inject(ImportOrchestrationService);
    readonly ledgerStore = inject(LedgerStore);

    // Mappings: Unknown QIF Category String -> Internal Category ID
    readonly mappings = signal<Record<string, string>>({});

    handleCategoryChange(unknownString: string, categoryId: string | null): void {
        this.mappings.update(m => {
            if (categoryId) {
                return { ...m, [unknownString]: categoryId };
            } else {
                const { [unknownString]: _removed, ...rest } = m;
                return rest;
            }
        });
    }

    async handleConfirm(): Promise<void> {
        await this.importService.resolveUnknownCategories(this.mappings());
    }

    handleCancel(): void {
        this.importService.cancel();
    }

    get isFullyMapped(): boolean {
        const unknowns = this.importService.unknownCategories();
        const mapped = this.mappings();
        return unknowns.every(u => !!mapped[u]);
    }
}
