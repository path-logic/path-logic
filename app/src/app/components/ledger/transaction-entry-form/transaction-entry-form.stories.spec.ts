import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { IAccount, ICategory, IPayee, ISODateString, ITransaction } from '@core';
import { AccountType, TransactionStatus } from '@core';
import { beforeEach, describe, expect, it } from 'vitest';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { TransactionEntryFormComponent } from './transaction-entry-form.component';
import { Default, DepositMode, TransferMode } from './transaction-entry-form.component.stories';

const mockApplyBatch = vi.fn();
const mockRecordTransfer = vi.fn();
const mockGetOrCreatePayee = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateTx = vi.fn();

const createMockPayee = (id: string, name: string): IPayee => ({
    id,
    name,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    latitude: null,
    longitude: null,
    website: null,
    phone: null,
    notes: null,
    defaultCategoryId: null,
    createdAt: '2024-01-01T00:00:00Z' as ISODateString,
    updatedAt: '2024-01-01T00:00:00Z' as ISODateString
});

describe('TransactionEntryFormComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<TransactionEntryFormComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Checking Account',
            institutionName: 'Chase Bank',
            type: AccountType.Checking,
            clearedBalance: 500000,
            pendingBalance: 500000,
            isActive: true,
            deletedAt: null,
            createdAt: '2024-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2024-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'acc-2',
            name: 'High Yield Savings',
            institutionName: 'Ally',
            type: AccountType.Savings,
            clearedBalance: 1250000,
            pendingBalance: 1250000,
            isActive: true,
            deletedAt: null,
            createdAt: '2024-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2024-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockPayees: Array<IPayee> = [
        createMockPayee('p-1', 'Netflix'),
        createMockPayee('p-2', 'Trader Joe')
    ];

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-1',
            name: 'Entertainment',
            parentId: null,
            isActive: true,
            description: '',
            createdAt: '2024-01-01' as ISODateString,
            updatedAt: '2024-01-01' as ISODateString
        }
    ];

    const mockTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            payeeId: 'p-1',
            date: '2024-01-01' as ISODateString,
            payee: 'Netflix',
            memo: 'Streaming',
            totalAmount: -1599,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-1', amount: -1599, categoryId: 'cat-1', memo: '' }],
            checkNumber: '1001',
            importHash: 'hash-1',
            createdAt: '2024-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2024-01-01T00:00:00Z' as ISODateString
        }
    ];

    beforeEach(async () => {
        mockApplyBatch.mockClear();
        mockRecordTransfer.mockClear();
        mockGetOrCreatePayee.mockClear();
        mockCreateCategory.mockClear();
        mockUpdateTx.mockClear();

        const mockLedgerStore = {
            accounts: signal<Array<IAccount>>(mockAccounts),
            payees: signal<Array<IPayee>>(mockPayees),
            categories: signal<Array<ICategory>>(mockCategories),
            transactions: signal<Array<ITransaction>>(mockTransactions),
            applyReconciliationBatch: mockApplyBatch,
            recordTransfer: mockRecordTransfer,
            getOrCreatePayee: mockGetOrCreatePayee,
            createCategory: mockCreateCategory,
            updateTransaction: mockUpdateTx
        };

        await TestBed.configureTestingModule({
            imports: [TransactionEntryFormComponent],
            providers: [
                provideNoopAnimations(),
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(TransactionEntryFormComponent);
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.detectChanges();
    });

    it('executes Default story interaction test simulating typing payee, amount, saving', async () => {
        await Default.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_title: string, fn: () => Promise<void>) => await fn()
        } as any);

        expect(mockApplyBatch).toHaveBeenCalledWith(
            [],
            [
                expect.objectContaining({
                    accountId: 'acc-1',
                    payee: 'Netflix',
                    totalAmount: -2550,
                    status: TransactionStatus.Cleared
                })
            ],
            []
        );
    }, 15000);

    it('executes DepositMode story interaction test', async () => {
        await DepositMode.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_title: string, fn: () => Promise<void>) => await fn()
        } as any);

        expect(fixture.nativeElement.textContent).toContain('Rcvd From');
    });

    it('executes TransferMode story interaction test', async () => {
        await TransferMode.play?.({
            canvasElement: fixture.nativeElement,
            step: async (_title: string, fn: () => Promise<void>) => await fn()
        } as any);

        expect(fixture.nativeElement.textContent).toContain('Transfer To');
    });
});
