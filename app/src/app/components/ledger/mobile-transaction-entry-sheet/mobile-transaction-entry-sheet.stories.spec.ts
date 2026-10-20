import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString,
    type ITransaction
} from '../../../core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { MobileTransactionEntrySheetComponent } from './mobile-transaction-entry-sheet.component';
import { DarkMode, Default, EditMode } from './mobile-transaction-entry-sheet.component.stories';

describe('MobileTransactionEntrySheetComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<MobileTransactionEntrySheetComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 542000 as Cents,
            pendingBalance: 542000 as Cents,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'acc-2',
            name: 'High Yield Savings',
            type: AccountType.Savings,
            institutionName: 'Ally',
            clearedBalance: 1500000 as Cents,
            pendingBalance: 1500000 as Cents,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockPayees: Array<IPayee> = [
        {
            id: 'p-1',
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
            defaultCategoryId: 'c-1',
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockCategories: Array<ICategory> = [
        {
            id: 'c-1',
            name: 'Groceries',
            parentId: null,
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockLedgerStore = {
        accounts: signal(mockAccounts),
        payees: signal(mockPayees),
        categories: signal(mockCategories),
        addTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        removeTransaction: vi.fn(),
        applyReconciliationBatch: vi.fn()
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MobileTransactionEntrySheetComponent],
            providers: [provideRouter([]), { provide: LedgerStore, useValue: mockLedgerStore }]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(MobileTransactionEntrySheetComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('New Transaction');
    });

    it('executes EditMode story interaction test', async () => {
        fixture = TestBed.createComponent(MobileTransactionEntrySheetComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.componentRef.setInput(
            'transaction',
            (EditMode.args?.transaction as ITransaction | undefined) ?? null
        );
        fixture.detectChanges();

        await EditMode.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Edit Transaction');
    });

    it('executes DarkMode story interaction test', async () => {
        fixture = TestBed.createComponent(MobileTransactionEntrySheetComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.detectChanges();

        await DarkMode.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('New Transaction');
    });
});
