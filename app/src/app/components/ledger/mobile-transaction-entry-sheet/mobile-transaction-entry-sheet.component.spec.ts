import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee
} from '../../../core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { MobileTransactionEntrySheetComponent } from './mobile-transaction-entry-sheet.component';

describe('MobileTransactionEntrySheetComponent', () => {
    let component: MobileTransactionEntrySheetComponent;
    let fixture: ComponentFixture<MobileTransactionEntrySheetComponent>;

    const mockAccount: IAccount = {
        id: 'acc-1',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 50000 as Cents,
        pendingBalance: 50000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    };

    const mockPayee: IPayee = {
        id: 'payee-1',
        name: 'Whole Foods Market',
        address: null,
        city: null,
        state: null,
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: 'cat-groceries',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    };

    const mockCategory: ICategory = {
        id: 'cat-groceries',
        name: 'Groceries',
        parentId: null,
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    };

    const mockLedgerStore = {
        accounts: signal<Array<IAccount>>([mockAccount]),
        payees: signal<Array<IPayee>>([mockPayee]),
        categories: signal<Array<ICategory>>([mockCategory]),
        addTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        removeTransaction: vi.fn(),
        applyReconciliationBatch: vi.fn()
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [MobileTransactionEntrySheetComponent, NoopAnimationsModule],
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(MobileTransactionEntrySheetComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.detectChanges();
    });

    it('should create the mobile fast-entry sheet component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default expense mode, empty amount, and current date', () => {
        expect(component.mode()).toBe('expense');
        expect(component.amountString()).toBe('0.00');
        expect(component.entryDate()).toBeTruthy();
    });

    it('should switch modes between expense, deposit, and transfer', () => {
        component.setMode('deposit');
        expect(component.mode()).toBe('deposit');

        component.setMode('transfer');
        expect(component.mode()).toBe('transfer');

        component.setMode('expense');
        expect(component.mode()).toBe('expense');
    });

    it('should handle numeric keypad clicks accurately for penny precision', () => {
        component.onKeypadPress('1');
        component.onKeypadPress('4');
        component.onKeypadPress('2');
        component.onKeypadPress('.');
        component.onKeypadPress('5');
        component.onKeypadPress('0');

        expect(component.amountString()).toBe('142.50');
        expect(component.amountCents()).toBe(14250);
    });

    it('should handle backspace / clear on keypad', () => {
        component.onKeypadPress('5');
        component.onKeypadPress('0');
        expect(component.amountString()).toBe('50');

        component.onKeypadBackspace();
        expect(component.amountString()).toBe('5');

        component.onKeypadClear();
        expect(component.amountString()).toBe('0.00');
    });

    it('should auto-populate default category when selecting a known payee', () => {
        component.onPayeeSelected(mockPayee);
        expect(component.selectedPayee()).toEqual(mockPayee);
        expect(component.selectedCategory()?.id).toBe('cat-groceries');
    });

    it('should save an expense transaction with negative amount in store and emit saved event', async () => {
        const savedSpy = vi.fn();
        component.saved.subscribe(savedSpy);

        component.setMode('expense');
        component.onKeypadPress('5');
        component.onKeypadPress('0');
        component.onPayeeSelected(mockPayee);

        await component.save();

        expect(mockLedgerStore.applyReconciliationBatch).toHaveBeenCalledWith(
            [],
            [
                expect.objectContaining({
                    accountId: 'acc-1',
                    totalAmount: -5000,
                    status: TransactionStatus.Cleared,
                    splits: expect.arrayContaining([
                        expect.objectContaining({
                            amount: -5000,
                            categoryId: 'cat-groceries'
                        })
                    ])
                })
            ],
            []
        );
        expect(savedSpy).toHaveBeenCalled();
    });

    it('should delete an existing transaction and close the sheet', async () => {
        const existingTx = {
            id: 'tx-existing-1',
            accountId: 'acc-1',
            date: '2026-08-15',
            payee: 'Target',
            payeeId: 'payee-1',
            memo: '',
            totalAmount: -2500,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-1', amount: -2500, categoryId: 'cat-groceries', memo: '' }],
            checkNumber: null,
            importHash: 'h-1',
            createdAt: '2026-08-15T00:00:00Z',
            updatedAt: '2026-08-15T00:00:00Z'
        };

        fixture.componentRef.setInput('transaction', existingTx as any);
        fixture.detectChanges();

        await component.deleteTransaction();

        expect(mockLedgerStore.removeTransaction).toHaveBeenCalledWith('tx-existing-1');
        expect(component.visible()).toBe(false);
    });

    it('should reset signals when close is called', () => {
        component.visible.set(true);
        component.amountString.set('99.99');

        component.close();

        expect(component.visible()).toBe(false);
        expect(component.amountString()).toBe('0.00');
    });
});
