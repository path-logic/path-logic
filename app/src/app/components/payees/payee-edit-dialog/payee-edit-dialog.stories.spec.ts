import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import type { IPayee } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeEditDialogComponent } from './payee-edit-dialog.component';
import { AddPayee, EditPayee, InteractiveValidation } from './payee-edit-dialog.component.stories';

describe('PayeeEditDialogComponent (Storybook Stories)', () => {
    const samplePayee: IPayee = {
        id: 'p-1',
        name: 'Whole Foods Market',
        address: '100 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        latitude: null,
        longitude: null,
        phone: '512-555-0100',
        website: 'https://wholefoods.com',
        notes: 'Organic groceries and snacks',
        defaultCategoryId: 'cat-groceries',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    };

    let mockLedgerStore: {
        payees: ReturnType<typeof signal<Array<IPayee>>>;
        updatePayee: ReturnType<typeof vi.fn>;
        getOrCreatePayee: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockLedgerStore = {
            payees: signal<Array<IPayee>>([samplePayee]),
            updatePayee: vi.fn().mockResolvedValue(undefined),
            getOrCreatePayee: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [PayeeEditDialogComponent, FormsModule],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('executes AddPayee story interaction test', async () => {
        const fixture: ComponentFixture<PayeeEditDialogComponent> =
            TestBed.createComponent(PayeeEditDialogComponent);
        fixture.componentRef.setInput('isOpen', AddPayee.args?.isOpen);
        fixture.componentRef.setInput('payeeToEdit', AddPayee.args?.payeeToEdit);
        fixture.detectChanges();

        await AddPayee.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Add Payee');
    });

    it('executes EditPayee story interaction test', async () => {
        const fixture: ComponentFixture<PayeeEditDialogComponent> =
            TestBed.createComponent(PayeeEditDialogComponent);
        fixture.componentRef.setInput('isOpen', EditPayee.args?.isOpen);
        fixture.componentRef.setInput('payeeToEdit', EditPayee.args?.payeeToEdit);
        fixture.detectChanges();

        await EditPayee.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Edit Payee');
    });

    it('executes InteractiveValidation story interaction test', async () => {
        const fixture: ComponentFixture<PayeeEditDialogComponent> =
            TestBed.createComponent(PayeeEditDialogComponent);
        fixture.componentRef.setInput('isOpen', InteractiveValidation.args?.isOpen);
        fixture.componentRef.setInput('payeeToEdit', InteractiveValidation.args?.payeeToEdit);
        fixture.detectChanges();

        await InteractiveValidation.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Payee name is required.');
    });
});
