import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import type { IPayee } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeEditDialogComponent } from './payee-edit-dialog.component';

describe('PayeeEditDialogComponent', () => {
    let component: PayeeEditDialogComponent;
    let fixture: ComponentFixture<PayeeEditDialogComponent>;

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
        notes: 'Organic groceries',
        defaultCategoryId: 'cat-groceries',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    };

    let mockPayeesSignal: ReturnType<typeof signal<Array<IPayee>>>;
    let updatePayeeSpy: ReturnType<typeof vi.fn>;
    let getOrCreatePayeeSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        mockPayeesSignal = signal<Array<IPayee>>([samplePayee]);
        updatePayeeSpy = vi.fn().mockResolvedValue(undefined);
        getOrCreatePayeeSpy = vi.fn().mockResolvedValue(undefined);

        const mockLedgerStore = {
            payees: mockPayeesSignal,
            updatePayee: updatePayeeSpy,
            getOrCreatePayee: getOrCreatePayeeSpy
        };

        await TestBed.configureTestingModule({
            imports: [PayeeEditDialogComponent, FormsModule],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(PayeeEditDialogComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize in add mode when payeeToEdit is null', () => {
        expect(component.isEditMode()).toBe(false);
        expect(component.dialogHeader).toBe('Add Payee');
        expect(component.name()).toBe('');
    });

    it('should populate fields in edit mode when payeeToEdit is provided', () => {
        fixture.componentRef.setInput('payeeToEdit', samplePayee);
        fixture.detectChanges();

        expect(component.isEditMode()).toBe(true);
        expect(component.dialogHeader).toBe('Edit Payee');
        expect(component.name()).toBe('Whole Foods Market');
        expect(component.city()).toBe('Austin');
        expect(component.state()).toBe('TX');
        expect(component.phone()).toBe('512-555-0100');
    });

    it('should validate that name is required', async () => {
        component.name.set('   ');
        await component.handleSave();

        expect(component.error()).toBe('Payee name is required.');
        expect(updatePayeeSpy).not.toHaveBeenCalled();
        expect(getOrCreatePayeeSpy).not.toHaveBeenCalled();
    });

    it('should save existing payee in edit mode and emit saved', async () => {
        const savedSpy = vi.fn();
        component.saved.subscribe(savedSpy);

        fixture.componentRef.setInput('payeeToEdit', samplePayee);
        fixture.detectChanges();

        component.name.set('Whole Foods Market Flagship');
        component.notes.set('Updated notes');

        await component.handleSave();

        expect(updatePayeeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'p-1',
                name: 'Whole Foods Market Flagship',
                notes: 'Updated notes'
            })
        );
        expect(savedSpy).toHaveBeenCalled();
        expect(component.isOpen()).toBe(false);
    });

    it('should create a new payee in add mode and emit saved', async () => {
        const savedSpy = vi.fn();
        component.saved.subscribe(savedSpy);

        getOrCreatePayeeSpy.mockImplementation(async (name: string) => {
            mockPayeesSignal.set([
                ...mockPayeesSignal(),
                {
                    id: 'p-new',
                    name,
                    address: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    phone: null,
                    website: null,
                    notes: null,
                    defaultCategoryId: null,
                    createdAt: '2026-03-01T00:00:00Z',
                    updatedAt: '2026-03-01T00:00:00Z'
                }
            ]);
        });

        component.name.set('Trader Joe');
        component.city.set('Austin');
        component.state.set('TX');

        await component.handleSave();

        expect(getOrCreatePayeeSpy).toHaveBeenCalledWith('Trader Joe');
        expect(updatePayeeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'p-new',
                name: 'Trader Joe',
                city: 'Austin',
                state: 'TX'
            })
        );
        expect(savedSpy).toHaveBeenCalled();
        expect(component.isOpen()).toBe(false);
    });

    it('should handle cancel by closing the dialog', () => {
        component.handleCancel();
        expect(component.isOpen()).toBe(false);
    });

    it('should display error when save fails', async () => {
        fixture.componentRef.setInput('payeeToEdit', samplePayee);
        fixture.detectChanges();

        updatePayeeSpy.mockRejectedValue(new Error('Network error'));
        await component.handleSave();

        expect(component.error()).toBe('Network error');
        expect(component.isSaving()).toBe(false);
    });
});
