import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    input,
    model,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IPayee, ISODateString } from '@core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';

/**
 * Dialog for creating or editing a payee record.
 * Supports both "add" (no initial payee) and "edit" (pre-populated) modes.
 */
@Component({
    selector: 'payee-edit-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
    templateUrl: './payee-edit-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayeeEditDialogComponent {
    private readonly ledgerStore = inject(LedgerStore);

    /** Two-way binding for dialog visibility */
    readonly isOpen = model<boolean>(false);

    /**
     * Pass an existing payee to edit, or null/undefined to create a new one.
     * The component deep-copies the data to avoid mutating the store directly.
     */
    readonly payeeToEdit = input<IPayee | null>(null);

    /** Emitted when a payee has been saved (added or updated). */
    readonly saved = output<IPayee>();

    // Form state (as signals for OnPush)
    readonly name = signal<string>('');
    readonly address = signal<string>('');
    readonly city = signal<string>('');
    readonly state = signal<string>('');
    readonly zipCode = signal<string>('');
    readonly phone = signal<string>('');
    readonly website = signal<string>('');
    readonly notes = signal<string>('');
    readonly isSaving = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    readonly isEditMode = signal<boolean>(false);

    constructor() {
        // Populate form when the payeeToEdit input changes
        effect(() => {
            const p = this.payeeToEdit();
            this.isEditMode.set(!!p);
            this.name.set(p?.name ?? '');
            this.address.set(p?.address ?? '');
            this.city.set(p?.city ?? '');
            this.state.set(p?.state ?? '');
            this.zipCode.set(p?.zipCode ?? '');
            this.phone.set(p?.phone ?? '');
            this.website.set(p?.website ?? '');
            this.notes.set(p?.notes ?? '');
            this.error.set(null);
        });
    }

    get dialogHeader(): string {
        return this.isEditMode() ? 'Edit Payee' : 'Add Payee';
    }

    async handleSave(): Promise<void> {
        const name = this.name().trim();
        if (!name) {
            this.error.set('Payee name is required.');
            return;
        }

        this.isSaving.set(true);
        this.error.set(null);

        try {
            const now = new Date().toISOString() as ISODateString;
            const existing = this.payeeToEdit();

            const payee: IPayee = {
                id:
                    existing?.id ??
                    `payee-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name,
                address: this.address().trim() || null,
                city: this.city().trim() || null,
                state: this.state().trim() || null,
                zipCode: this.zipCode().trim() || null,
                latitude: existing?.latitude ?? null,
                longitude: existing?.longitude ?? null,
                phone: this.phone().trim() || null,
                website: this.website().trim() || null,
                notes: this.notes().trim() || null,
                defaultCategoryId: existing?.defaultCategoryId ?? null,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now
            };

            if (this.isEditMode()) {
                await this.ledgerStore.updatePayee(payee);
            } else {
                // Use getOrCreatePayee for the add path so we don't dupe by name
                await this.ledgerStore.getOrCreatePayee(name);
                // Then update with the full data
                const created = this.ledgerStore.payees().find(p => p.name === name);
                if (created) {
                    const withDetails: IPayee = { ...created, ...payee, id: created.id };
                    await this.ledgerStore.updatePayee(withDetails);
                    this.saved.emit(withDetails);
                    this.isOpen.set(false);
                    return;
                }
            }

            this.saved.emit(payee);
            this.isOpen.set(false);
        } catch (err) {
            this.error.set(err instanceof Error ? err.message : 'Failed to save payee.');
        } finally {
            this.isSaving.set(false);
        }
    }

    handleCancel(): void {
        this.isOpen.set(false);
    }
}
