import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString,
    type ITransaction
} from '@core';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SyncService } from '../../../services/sync/sync.service';
import { SplitTransactionPageComponent } from './split-transaction-page.component';

describe('SplitTransactionPageComponent', () => {
    let component: SplitTransactionPageComponent;
    let fixture: ComponentFixture<SplitTransactionPageComponent>;
    let router: Router;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Checking Account',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 500000 as Cents,
            pendingBalance: 500000 as Cents,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockCategories: Array<ICategory> = [
        {
            id: 'cat-income',
            parentId: null,
            name: 'Salary & Wages',
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'cat-tax',
            parentId: null,
            name: 'Taxes',
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'cat-insurance',
            parentId: null,
            name: 'Health Insurance',
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        },
        {
            id: 'cat-groceries',
            parentId: null,
            name: 'Groceries',
            description: null,
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockTransaction: ITransaction = {
        id: 'tx-paycheck',
        accountId: 'acc-1',
        date: '2026-08-15' as ISODateString,
        payee: 'Acme Corp Payroll',
        payeeId: 'p-acme',
        memo: 'Bi-weekly Paycheck',
        totalAmount: 200000 as Cents, // $2,000.00
        status: TransactionStatus.Cleared,
        splits: [
            { id: 's-1', amount: 250000 as Cents, categoryId: 'cat-income', memo: 'Gross Pay' }, // +$2,500
            {
                id: 's-2',
                amount: -50000 as Cents,
                categoryId: 'cat-tax',
                memo: 'Federal & State Tax'
            } // -$500
        ],
        checkNumber: null,
        importHash: 'h-paycheck',
        createdAt: '2026-08-15T00:00:00Z' as ISODateString,
        updatedAt: '2026-08-15T00:00:00Z' as ISODateString
    };

    const mockLedgerStore = {
        isInitialized: signal(true),
        authError: signal(null),
        hasLocalFallback: signal(true),
        syncStatus: signal('idle'),
        accounts: signal(mockAccounts),
        categories: signal(mockCategories),
        transactions: signal([mockTransaction]),
        payees: signal<Array<IPayee>>([]),
        updateTransaction: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuthService = {
        accessToken: signal<string | null>(null),
        currentUser: signal(null),
        isLoggedIn: signal(true),
        isInitializing: signal(false)
    };

    const mockSyncService = {
        isSyncing: signal(false),
        getSyncStatus: vi.fn().mockReturnValue('idle')
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SplitTransactionPageComponent],
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SyncService, useValue: mockSyncService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: (key: string) => {
                                    if (key === 'accountId') return 'acc-1';
                                    if (key === 'transactionId') return 'tx-paycheck';
                                    return null;
                                }
                            }
                        }
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(SplitTransactionPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create SplitTransactionPageComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should load initial transaction and splits from route params', () => {
        expect(component.transaction()?.id).toBe('tx-paycheck');
        expect(component.totalAmount()).toBe(200000);
        expect(component.splits().length).toBe(2);
        expect(component.sumSplits()).toBe(200000);
        expect(component.remainingAmount()).toBe(0);
        expect(component.isBalanced()).toBe(true);
    });

    it('should calculate difference correctly when a split amount changes', () => {
        // Change Gross Pay from +$2,500 to +$2,400 (240000 cents)
        component.updateSplitAmount(0, 240000);
        expect(component.sumSplits()).toBe(190000);
        expect(component.remainingAmount()).toBe(10000); // 10000 cents ($100.00) remaining
        expect(component.isBalanced()).toBe(false);
    });

    it('should support adding and removing split lines', () => {
        expect(component.splits().length).toBe(2);
        component.addSplit();
        expect(component.splits().length).toBe(3);

        component.removeSplit(2);
        expect(component.splits().length).toBe(2);
    });

    it('should auto-fill remainder to balance transaction', () => {
        component.updateSplitAmount(0, 240000); // -$100 difference
        expect(component.isBalanced()).toBe(false);

        component.autoFillRemainder();
        expect(component.isBalanced()).toBe(true);
        expect(component.sumSplits()).toBe(200000);
    });

    it('should toggle deduction/income sign correctly', () => {
        // Line 0 is positive (250000) -> toggle to negative
        component.toggleSplitSign(0);
        expect(component.splits()[0]?.amount).toBe(-250000);

        // Toggle back to positive
        component.toggleSplitSign(0);
        expect(component.splits()[0]?.amount).toBe(250000);
    });

    it('should save splits and update transaction in LedgerStore', async () => {
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        await component.saveSplits();

        expect(mockLedgerStore.updateTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tx-paycheck',
                splits: expect.arrayContaining([
                    expect.objectContaining({ amount: 250000 }),
                    expect.objectContaining({ amount: -50000 })
                ])
            })
        );
        expect(navigateSpy).toHaveBeenCalledWith(['/accounts', 'acc-1']);
    });
});
