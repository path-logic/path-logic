import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PayeeAutocompleteComponent } from './payee-autocomplete.component';

describe('PayeeAutocompleteComponent', () => {
    let component: PayeeAutocompleteComponent;
    let fixture: ComponentFixture<PayeeAutocompleteComponent>;

    const mockPayees = signal([
        { id: 'p-1', name: 'Netflix' },
        { id: 'p-2', name: 'Whole Foods' },
        { id: 'p-3', name: 'Target' }
    ]);

    beforeEach(async () => {
        const mockStore = {
            payees: mockPayees
        };

        await TestBed.configureTestingModule({
            imports: [PayeeAutocompleteComponent, FormsModule],
            providers: [{ provide: LedgerStore, useValue: mockStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(PayeeAutocompleteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the payee autocomplete component', () => {
        expect(component).toBeTruthy();
    });

    it('should show all payees when input is empty and focused', () => {
        component.handleInputFocus();
        expect(component.isDropdownOpen()).toBe(true);
        expect(component.suggestions().length).toBe(3);
    });

    it('should filter payees on input and offer "Add new" for non-exact matches', () => {
        component.handleInputChange('Net');
        expect(component.isDropdownOpen()).toBe(true);
        expect(component.suggestions().length).toBe(2);
        expect(component.suggestions()[0]?.isNew).toBe(true);
        expect(component.suggestions()[0]?.name).toBe('Net');
        expect(component.suggestions()[1]?.name).toBe('Netflix');

        component.handleInputChange('Netflix');
        expect(component.suggestions().length).toBe(1);
        expect(component.suggestions()[0]?.name).toBe('Netflix');
        expect(component.suggestions()[0]?.isNew).toBeUndefined();
    });

    it('should select payee and emit changes via ControlValueAccessor', () => {
        const changeSpy = vi.fn();
        component.registerOnChange(changeSpy);

        component.selectPayee({ id: 'p-1', name: 'Netflix' });
        expect(component.displayValue()).toBe('Netflix');
        expect(component.isDropdownOpen()).toBe(false);
        expect(changeSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Netflix' }));
    });

    it('should navigate suggestions via keyboard ArrowDown, ArrowUp, and select with Enter', () => {
        component.handleInputChange('');
        expect(component.suggestions().length).toBe(3);

        const arrowDown = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        component.handleKeyDown(arrowDown);
        expect(component.highlightedIndex()).toBe(0);

        component.handleKeyDown(arrowDown);
        expect(component.highlightedIndex()).toBe(1);

        const changeSpy = vi.fn();
        component.registerOnChange(changeSpy);

        const enter = new KeyboardEvent('keydown', { key: 'Enter' });
        component.handleKeyDown(enter);
        expect(component.displayValue()).toBe('Whole Foods');
        expect(component.isDropdownOpen()).toBe(false);
    });
});
