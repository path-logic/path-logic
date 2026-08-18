import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { QuickEntryWidgetComponent } from './quick-entry-widget.component';

describe('QuickEntryWidgetComponent', () => {
    let component: QuickEntryWidgetComponent;
    let fixture: ComponentFixture<QuickEntryWidgetComponent>;
    let ledgerStore: LedgerStore;

    const mockAccounts = signal([
        {
            id: 'acc-1',
            name: 'Checking',
            institutionName: 'Chase',
            type: 'checking',
            balance: 100000,
            isActive: true
        }
    ]);
    const mockPayees = signal([
        { id: 'payee-1', name: 'Netflix' },
        { id: 'payee-2', name: 'Whole Foods' }
    ]);

    beforeEach(async () => {
        const mockStore = {
            accounts: mockAccounts,
            payees: mockPayees,
            addTransaction: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [QuickEntryWidgetComponent],
            providers: [provideRouter([]), { provide: LedgerStore, useValue: mockStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(QuickEntryWidgetComponent);
        component = fixture.componentInstance;
        ledgerStore = TestBed.inject(LedgerStore);
        fixture.detectChanges();
    });

    it('should create the quick entry widget', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle expense and income types', () => {
        expect(component.isExpense()).toBe(true);
        component.toggleType();
        expect(component.isExpense()).toBe(false);
        component.toggleType();
        expect(component.isExpense()).toBe(true);
    });

    it('should show error if payee is missing', async () => {
        component.selectedAccountId.set('acc-1');
        component.payee.set('');
        component.amountString.set('10.00');

        await component.saveTransaction();
        expect(component.errorMessage()).toBe('Please enter a payee.');
        expect(ledgerStore.addTransaction).not.toHaveBeenCalled();
    });

    it('should show error if amount is invalid or zero', async () => {
        component.selectedAccountId.set('acc-1');
        component.payee.set('Coffee Shop');
        component.amountString.set('0.00');

        await component.saveTransaction();
        expect(component.errorMessage()).toBe('Please enter a valid non-zero amount.');
        expect(ledgerStore.addTransaction).not.toHaveBeenCalled();
    });

    it('should save expense transaction with negative amount in cents', async () => {
        component.selectedAccountId.set('acc-1');
        component.payee.set('Trader Joe');
        component.category.set('Groceries');
        component.amountString.set('45.50');
        component.isExpense.set(true);

        await component.saveTransaction();
        expect(ledgerStore.addTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                accountId: 'acc-1',
                payee: 'Trader Joe',
                memo: 'Groceries',
                totalAmount: -4550 // -45.50 * 100
            })
        );
        expect(component.showSuccess()).toBe(true);
    });

    it('should save income transaction with positive amount in cents', async () => {
        component.selectedAccountId.set('acc-1');
        component.payee.set('Client Invoice');
        component.amountString.set('500.00');
        component.isExpense.set(false);

        await component.saveTransaction();
        expect(ledgerStore.addTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                accountId: 'acc-1',
                payee: 'Client Invoice',
                totalAmount: 50000 // 500.00 * 100
            })
        );
    });

    it('should preselect account when preselectedAccountId input changes', () => {
        fixture.componentRef.setInput('preselectedAccountId', 'acc-1');
        fixture.detectChanges();
        expect(component.selectedAccountId()).toBe('acc-1');
    });

    it('should close when close() is invoked or close button clicked', () => {
        expect(component.visible()).toBe(true);
        component.close();
        expect(component.visible()).toBe(false);
    });

    it('should update payee signal and handle form submission', () => {
        component.payee.set('Netflix');
        expect(component.payee()).toBe('Netflix');
    });
});
