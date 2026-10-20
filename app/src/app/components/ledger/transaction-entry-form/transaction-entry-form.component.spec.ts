import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { IAccount, ICategory, IPayee, ISODateString, ISplit, ITransaction } from '@core';
import { AccountType, TransactionStatus } from '@core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { TransactionEntryFormComponent } from './transaction-entry-form.component';

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

const createMockTransaction = (overrides: Partial<ITransaction> = {}): ITransaction => ({
    id: 'tx-1',
    accountId: 'acc-1',
    payeeId: 'payee-1',
    date: '2024-01-10' as ISODateString,
    payee: 'Landlord',
    memo: 'Monthly rent',
    totalAmount: -120000,
    status: TransactionStatus.Cleared,
    splits: [{ id: 's-1', amount: -120000, categoryId: null, memo: '' }],
    checkNumber: '1004',
    importHash: 'hash-1',
    createdAt: '2024-01-10T00:00:00Z' as ISODateString,
    updatedAt: '2024-01-10T00:00:00Z' as ISODateString,
    ...overrides
});

describe('TransactionEntryFormComponent', () => {
    let component: TransactionEntryFormComponent;
    let fixture: ComponentFixture<TransactionEntryFormComponent>;
    let mockLedgerStore: {
        accounts: ReturnType<typeof signal<Array<IAccount>>>;
        payees: ReturnType<typeof signal<Array<IPayee>>>;
        categories: ReturnType<typeof signal<Array<ICategory>>>;
        transactions: ReturnType<typeof signal<Array<ITransaction>>>;
        recordTransfer: ReturnType<typeof vi.fn>;
        getOrCreatePayee: ReturnType<typeof vi.fn>;
        createCategory: ReturnType<typeof vi.fn>;
        updateTransaction: ReturnType<typeof vi.fn>;
        applyReconciliationBatch: ReturnType<typeof vi.fn>;
    };

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Primary Checking',
            institutionName: 'Chase',
            type: AccountType.Checking,
            clearedBalance: 200000,
            pendingBalance: 200000,
            isActive: true,
            deletedAt: null,
            createdAt: '2024-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2024-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'acc-2',
            name: 'Savings Reserve',
            institutionName: 'Marcus',
            type: AccountType.Savings,
            clearedBalance: 850000,
            pendingBalance: 850000,
            isActive: true,
            deletedAt: null,
            createdAt: '2024-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2024-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockPayees: Array<IPayee> = [
        createMockPayee('payee-1', 'Netflix'),
        createMockPayee('payee-2', 'Trader Joe')
    ];

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-1',
            name: 'Food & Dining',
            parentId: null,
            isActive: true,
            description: 'Restaurants and groceries',
            createdAt: '2024-01-01' as ISODateString,
            updatedAt: '2024-01-01' as ISODateString
        },
        {
            id: 'cat-2',
            name: 'Groceries',
            parentId: 'cat-1',
            isActive: true,
            description: 'Food stores',
            createdAt: '2024-01-01' as ISODateString,
            updatedAt: '2024-01-01' as ISODateString
        }
    ];

    const mockTransactions: Array<ITransaction> = [createMockTransaction()];

    beforeEach(async () => {
        mockLedgerStore = {
            accounts: signal<Array<IAccount>>(mockAccounts),
            payees: signal<Array<IPayee>>(mockPayees),
            categories: signal<Array<ICategory>>(mockCategories),
            transactions: signal<Array<ITransaction>>(mockTransactions),
            recordTransfer: vi.fn().mockResolvedValue(undefined),
            getOrCreatePayee: vi
                .fn()
                .mockImplementation(async (name: string) =>
                    createMockPayee(`payee-${name.toLowerCase().replace(/\s+/g, '-')}`, name)
                ),
            createCategory: vi
                .fn()
                .mockImplementation(async (name: string, parentId: string | null) => ({
                    id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}`,
                    name,
                    parentId,
                    isActive: true,
                    description: '',
                    createdAt: '2024-01-01' as ISODateString,
                    updatedAt: '2024-01-01' as ISODateString
                })),
            updateTransaction: vi.fn().mockResolvedValue(undefined),
            applyReconciliationBatch: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [TransactionEntryFormComponent],
            providers: [
                provideNoopAnimations(),
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(TransactionEntryFormComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('accountId', 'acc-1');
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should resolve the active account', () => {
        expect(component.activeAccount()?.id).toBe('acc-1');
        expect(component.activeAccount()?.name).toBe('Primary Checking');
    });

    it('should calculate next check number based on existing transactions', () => {
        expect(component.nextCheckNumber()).toBe('1005');

        // With no check numbers, fallback is 1001
        mockLedgerStore.transactions.set([]);
        expect(component.nextCheckNumber()).toBe('1001');
    });

    it('should toggle entry modes and compute formThemeClass accordingly', () => {
        expect(component.mode()).toBe('expense');
        expect(component.formThemeClass()).toContain('from-blue-50');

        component.mode.set('deposit');
        expect(component.formThemeClass()).toContain('from-emerald-50');

        component.mode.set('transfer');
        expect(component.formThemeClass()).toContain('from-violet-50');
    });

    it('should compute isFormValid correctly for expense mode', () => {
        expect(component.isFormValid()).toBe(false);

        component.entryAmount.set(4500);
        expect(component.isFormValid()).toBe(false);

        component.selectedPayee.set('Trader Joe');
        expect(component.isFormValid()).toBe(true);

        component.entryAmount.set(0);
        expect(component.isFormValid()).toBe(false);
    });

    it('should compute isFormValid correctly for transfer mode', () => {
        component.mode.set('transfer');
        component.entryAmount.set(5000);
        expect(component.isFormValid()).toBe(false);

        component.transferToAccountId.set('acc-2');
        expect(component.isFormValid()).toBe(true);
    });

    it('should compute isFormDirty when inputs change', () => {
        expect(component.isFormDirty()).toBe(false);

        component.entryMemo.set('Coffee meeting');
        expect(component.isFormDirty()).toBe(true);

        component.resetForm();
        expect(component.isFormDirty()).toBe(false);
    });

    it('should filter check numbers with defaults and user input', () => {
        component.filterCheckNumbers({ query: '' });
        expect(component.filteredCheckNumbers()).toContain('1005');
        expect(component.filteredCheckNumbers()).toContain('Debit');

        component.filterCheckNumbers({ query: 'atm' });
        expect(component.filteredCheckNumbers()).toContain('ATM');

        component.filterCheckNumbers({ query: '9999' });
        expect(component.filteredCheckNumbers()[0]).toBe('9999');
    });

    it('should filter categories and build indented hierarchy', () => {
        component.filterCategories({ query: 'groc' });
        const filtered = component.filteredCategories();
        expect(filtered.some(c => c.name === 'Groceries')).toBe(true);
    });

    it('should support new category and subcategory creation syntax in category filter', () => {
        component.filterCategories({ query: 'Utilities:Electricity' });
        const filtered = component.filteredCategories();
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered[0]?.displayName).toBe("Create 'Utilities' -> 'Electricity'");

        component.filterCategories({ query: 'BrandNewCategory' });
        const topLevelFiltered = component.filteredCategories();
        expect(topLevelFiltered[0]?.displayName).toBe("Create new category 'BrandNewCategory'");
    });

    it('should open split dialog and handle saved splits', () => {
        component.openSplitDialog();
        expect(component.isSplitDialogOpen()).toBe(true);

        const newSplits: Array<ISplit> = [
            { id: 's-1', amount: 3000, categoryId: 'cat-1', memo: 'Food' },
            { id: 's-2', amount: 2000, categoryId: 'cat-2', memo: 'Produce' }
        ];
        component.handleSplitsSaved({ splits: newSplits, newTotal: 5000 });

        expect(component.manualSplits().length).toBe(2);
        expect(component.entryAmount()).toBe(5000);
    });

    it('should submit expense transaction with string payee and cleared status', async () => {
        component.mode.set('expense');
        component.selectedPayee.set('New Coffee Shop');
        component.entryAmount.set(450);
        component.entryMemo.set('Morning espresso');
        component.entryCheckNumber.set('1005');

        await component.submit();

        expect(mockLedgerStore.getOrCreatePayee).toHaveBeenCalledWith('New Coffee Shop');
        expect(mockLedgerStore.applyReconciliationBatch).toHaveBeenCalledWith(
            [],
            [
                expect.objectContaining({
                    accountId: 'acc-1',
                    payee: 'New Coffee Shop',
                    totalAmount: -450,
                    status: TransactionStatus.Cleared,
                    memo: 'Morning espresso',
                    checkNumber: '1005'
                })
            ],
            []
        );
        expect(component.entryAmount()).toBeNull();
    });

    it('should submit deposit transaction with existing payee object', async () => {
        component.mode.set('deposit');
        component.selectedPayee.set(mockPayees[0] ?? null);
        component.entryAmount.set(100000);
        component.entryMemo.set('Refund');

        await component.submit();

        expect(mockLedgerStore.getOrCreatePayee).not.toHaveBeenCalled();
        expect(mockLedgerStore.applyReconciliationBatch).toHaveBeenCalledWith(
            [],
            [
                expect.objectContaining({
                    accountId: 'acc-1',
                    payeeId: 'payee-1',
                    payee: 'Netflix',
                    totalAmount: 100000,
                    status: TransactionStatus.Cleared
                })
            ],
            []
        );
    });

    it('should submit transfer transaction', async () => {
        component.mode.set('transfer');
        component.transferToAccountId.set('acc-2');
        component.entryAmount.set(25000);
        component.entryMemo.set('Monthly savings');

        await component.submit();

        expect(mockLedgerStore.recordTransfer).toHaveBeenCalledWith(
            'acc-1',
            'acc-2',
            25000,
            component.entryDate(),
            'Monthly savings'
        );
        expect(component.transferToAccountId()).toBe('');
    });

    it('should resolve and create new category when submitting', async () => {
        component.mode.set('expense');
        component.selectedPayee.set('Hardware Store');
        component.selectedCategory.set('Home Improvement');
        component.entryAmount.set(3500);

        await component.submit();

        expect(mockLedgerStore.createCategory).toHaveBeenCalledWith('Home Improvement', null);
        expect(mockLedgerStore.applyReconciliationBatch).toHaveBeenCalled();
    });

    it('should edit an existing transaction and update it on submit', async () => {
        const txToEdit: ITransaction = createMockTransaction({
            id: 'tx-edit-1',
            accountId: 'acc-1',
            payeeId: 'payee-1',
            payee: 'Netflix',
            date: '2024-01-15' as ISODateString,
            totalAmount: -1599,
            memo: 'Subscription',
            status: TransactionStatus.Cleared,
            splits: [{ id: 'sp-1', amount: -1599, categoryId: 'cat-1', memo: '' }],
            checkNumber: null,
            importHash: 'import-1'
        });

        component.editTransaction(txToEdit);

        expect(component.editingTransaction()).toEqual(txToEdit);
        expect(component.mode()).toBe('expense');
        expect(component.entryAmount()).toBe(1599);
        expect(component.entryMemo()).toBe('Subscription');

        component.entryMemo.set('Subscription Updated');
        await component.submit();

        expect(mockLedgerStore.updateTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tx-edit-1',
                memo: 'Subscription Updated',
                totalAmount: -1599
            })
        );
        expect(component.editingTransaction()).toBeNull();
    });

    it('should ignore editTransaction if transaction has linkedTransferId', () => {
        const transferTx: ITransaction = createMockTransaction({
            id: 'tx-transfer-1',
            accountId: 'acc-1',
            payee: 'Transfer',
            memo: 'Transfer',
            checkNumber: null,
            date: '2024-01-15' as ISODateString,
            totalAmount: -5000,
            status: TransactionStatus.Cleared,
            splits: [],
            linkedTransferId: 'transfer-id-99',
            importHash: 'hash-transfer'
        });

        component.editTransaction(transferTx);
        expect(component.editingTransaction()).toBeNull();
    });

    it('should emit requestAddAccount when Add Account button is clicked in transfer empty state', () => {
        mockLedgerStore.accounts.set([mockAccounts[0]!]);
        component.mode.set('transfer');
        fixture.detectChanges();

        const emitSpy = vi.spyOn(component.requestAddAccount, 'emit');
        const compiled = fixture.nativeElement as HTMLElement;
        const addAccBtn = compiled.querySelector('button.pl-btn-primary') as HTMLButtonElement;
        expect(addAccBtn).toBeTruthy();
        addAccBtn.click();

        expect(emitSpy).toHaveBeenCalled();
    });

    it('should leave manualSplits empty and keep category editable when editing a single-split transaction', () => {
        const singleSplitTx: ITransaction = createMockTransaction({
            id: 'tx-single-1',
            accountId: 'acc-1',
            payee: 'Twilight Plumbing',
            memo: 'Fix pipe leak',
            totalAmount: -17550,
            date: '2026-09-18' as ISODateString,
            splits: [{ id: 'sp-single-1', amount: -17550, categoryId: 'cat-1', memo: '' }],
            checkNumber: null,
            importHash: 'import-single-1'
        });

        component.editTransaction(singleSplitTx);

        expect(component.editingTransaction()).toEqual(singleSplitTx);
        expect(component.manualSplits()).toEqual([]);
        expect(component.selectedCategory()).toEqual(mockCategories[0]);
    });

    it('should populate manualSplits when editing a multi-split transaction', () => {
        const multiSplitTx: ITransaction = createMockTransaction({
            id: 'tx-multi-1',
            accountId: 'acc-1',
            payee: 'Home Depot',
            memo: 'Hardware supplies',
            totalAmount: -15000,
            date: '2026-09-18' as ISODateString,
            splits: [
                { id: 'sp-multi-1', amount: -10000, categoryId: 'cat-1', memo: 'Tools' },
                { id: 'sp-multi-2', amount: -5000, categoryId: 'cat-2', memo: 'Paint' }
            ],
            checkNumber: null,
            importHash: 'import-multi-1'
        });

        component.editTransaction(multiSplitTx);

        expect(component.manualSplits().length).toBe(2);
        expect(component.manualSplits()[0]?.id).toBe('sp-multi-1');
        expect(component.manualSplits()[1]?.id).toBe('sp-multi-2');
    });

    it('should compute signed currentEntryAmountCents (negative for expense, positive for deposit)', () => {
        component.mode.set('expense');
        component.entryAmount.set(17550);
        expect(component.currentEntryAmountCents()).toBe(-17550);

        component.mode.set('deposit');
        component.entryAmount.set(200000);
        expect(component.currentEntryAmountCents()).toBe(200000);
    });

    it('should allow updating only the date of an existing transaction and submit with updated date and preserved split id', async () => {
        const existingTx: ITransaction = createMockTransaction({
            id: 'tx-plumbing-1',
            accountId: 'acc-1',
            payee: 'Twilight Plumbing',
            memo: 'Emergency service',
            totalAmount: -17550,
            date: '2026-09-18' as ISODateString,
            splits: [{ id: 'sp-plumbing-1', amount: -17550, categoryId: 'cat-1', memo: '' }],
            checkNumber: null,
            importHash: 'hash-plumbing'
        });

        component.editTransaction(existingTx);
        expect(component.entryDate()).toBe('2026-09-18');

        // User updates ONLY the date to 2026-09-20
        component.entryDate.set('2026-09-20');
        await component.submit();

        expect(mockLedgerStore.updateTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tx-plumbing-1',
                date: '2026-09-20',
                totalAmount: -17550,
                splits: [
                    expect.objectContaining({
                        id: 'sp-plumbing-1',
                        amount: -17550,
                        categoryId: 'cat-1'
                    })
                ]
            })
        );
        expect(component.editingTransaction()).toBeNull();
    });
});
