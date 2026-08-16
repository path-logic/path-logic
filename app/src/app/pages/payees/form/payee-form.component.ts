import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';
import type { IPayee } from '../../../core/domain/types';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

@Component({
    selector: 'payee-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, AppShellComponent],
    templateUrl: './payee-form.component.html'
})
export class PayeeFormComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    readonly ledgerStore = inject(LedgerStore);

    // Optional input if embedded in a desktop modal
    readonly initialPayee = input<IPayee | null | undefined>(null);

    // Form signals
    readonly payeeId = signal<string | null>(null);
    readonly name = signal<string>('');
    readonly defaultCategoryId = signal<string>('');
    readonly notes = signal<string>('');
    readonly isSubmitting = signal<boolean>(false);
    readonly errorMessage = signal<string | null>(null);

    // Computed states
    readonly isEditMode = computed(() => !!this.payeeId());
    readonly categories = computed(() => this.ledgerStore.categories());

    ngOnInit(): void {
        const inputPayee = this.initialPayee();
        if (inputPayee) {
            this.loadPayee(inputPayee);
            return;
        }

        // Check route params
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.payeeId.set(id);
                const existing = this.ledgerStore.payees().find(p => p.id === id);
                if (existing) {
                    this.loadPayee(existing);
                }
            }
        });

        // Check query params for initial values
        this.route.queryParams.subscribe(qParams => {
            if (!this.payeeId()) {
                if (qParams['name']) {
                    this.name.set(qParams['name']);
                }
                if (qParams['defaultCategoryId']) {
                    this.defaultCategoryId.set(qParams['defaultCategoryId']);
                }
            }
        });
    }

    loadPayee(payee: IPayee): void {
        this.payeeId.set(payee.id);
        this.name.set(payee.name || '');
        this.defaultCategoryId.set(payee.defaultCategoryId || '');
        this.notes.set(payee.notes || '');
    }

    async handleSave(): Promise<void> {
        const trimmedName = this.name().trim();
        if (!trimmedName) {
            this.errorMessage.set('Name is required');
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set(null);

        try {
            const currentId = this.payeeId();
            const now = new Date().toISOString();
            if (currentId) {
                const existing = this.ledgerStore.payees().find(p => p.id === currentId);
                const updatedPayee: IPayee = {
                    id: currentId,
                    name: trimmedName,
                    defaultCategoryId: this.defaultCategoryId().trim() || null,
                    notes: this.notes().trim() || null,
                    address: existing?.address || null,
                    city: existing?.city || null,
                    state: existing?.state || null,
                    zipCode: existing?.zipCode || null,
                    latitude: existing?.latitude || null,
                    longitude: existing?.longitude || null,
                    website: existing?.website || null,
                    phone: existing?.phone || null,
                    createdAt: existing?.createdAt || now,
                    updatedAt: now
                };
                await this.ledgerStore.updatePayee(updatedPayee);
            } else {
                const created = await this.ledgerStore.getOrCreatePayee(trimmedName);
                if (this.defaultCategoryId().trim() || this.notes().trim()) {
                    await this.ledgerStore.updatePayee({
                        ...created,
                        defaultCategoryId: this.defaultCategoryId().trim() || null,
                        notes: this.notes().trim() || null,
                        updatedAt: now
                    });
                }
            }

            void this.router.navigate(['/payees']);
        } catch (err: unknown) {
            console.error('Failed to save payee:', err);
            this.errorMessage.set('Failed to save payee. Please check your data and try again.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    handleCancel(): void {
        void this.router.navigate(['/payees']);
    }
}
