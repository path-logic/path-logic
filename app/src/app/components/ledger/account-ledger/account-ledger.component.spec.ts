import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
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
} from '../../../core';
import { AuthService } from '../../../services/auth/auth.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SyncService } from '../../../services/sync/sync.service';
import { AccountLedgerComponent } from './account-ledger.component';

describe('AccountLedgerComponent', () => {
    let component: AccountLedgerComponent;
    let fixture: ComponentFixture<AccountLedgerComponent>;

    const mockAccounts: Array<IAccount> = [
        {
            id: 'acc-1',
            name: 'Main Checking',
            type: AccountType.Checking,
            institutionName: 'Chase',
            clearedBalance: 50000 as Cents,
            pendingBalance: 50000 as Cents,
            isActive: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00Z' as ISODateString,
            updatedAt: '2026-01-01T00:00:00Z' as ISODateString
        }
    ];

    const mockTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-15' as ISODateString,
            payee: 'Whole Foods Market',
            payeeId: 'p-1',
            memo: 'Groceries',
            totalAmount: -4250 as Cents,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-1', amount: -4250 as Cents, categoryId: 'cat-1', memo: '' }],
            checkNumber: null,
            importHash: 'h-1',
            createdAt: '2026-08-15T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-15T00:00:00Z' as ISODateString
        },
        {
            id: 'tx-2',
            accountId: 'acc-1',
            date: '2026-08-16' as ISODateString,
            payee: 'Coffee Shop',
            payeeId: 'p-2',
            memo: 'Latte',
            totalAmount: -550 as Cents,
            status: TransactionStatus.Pending,
            splits: [{ id: 's-2', amount: -550 as Cents, categoryId: 'cat-2', memo: '' }],
            checkNumber: null,
            importHash: 'h-2',
            createdAt: '2026-08-16T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-16T00:00:00Z' as ISODateString
        }
    ];

    const mockLedgerStore = {
        isInitialized: signal(true),
        accounts: signal(mockAccounts),
        transactions: signal(mockTransactions),
        payees: signal<Array<IPayee>>([]),
        categories: signal<Array<ICategory>>([]),
        syncStatus: signal('idle'),
        authError: signal(null),
        hasLocalFallback: signal(true),
        deleteTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        applyReconciliationBatch: vi.fn()
    };

    const mockImportService = {
        progress: signal({ stage: 'idle', percent: 0, message: '' }),
        matches: signal([]),
        stats: signal(null),
        unknownCategories: signal<Array<string>>([]),
        handleFile: vi.fn(),
        cancel: vi.fn(),
        reset: vi.fn()
    };

    const mockPostHogService = {
        posthog: {
            capture: vi.fn()
        }
    };

    const mockSyncService = {
        isSyncing: signal(false),
        sync: vi.fn(),
        startAutoSync: vi.fn(),
        stopAutoSync: vi.fn()
    };

    const mockAuthService = {
        user: signal(null),
        isAuthenticated: signal(false),
        logout: vi.fn()
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [AccountLedgerComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AccountLedgerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the account ledger component', () => {
        expect(component).toBeTruthy();
    });

    it('should auto-select the first account if none specified', () => {
        expect(component.activeAccount()?.id).toBe('acc-1');
    });

    it('should filter transactions by status correctly', () => {
        component.setStatusFilter('all');
        expect(component.filteredTransactions().length).toBe(2);

        component.setStatusFilter('cleared');
        expect(component.filteredTransactions().length).toBe(1);
        expect(component.filteredTransactions()[0]?.id).toBe('tx-1');

        component.setStatusFilter('pending');
        expect(component.filteredTransactions().length).toBe(1);
        expect(component.filteredTransactions()[0]?.id).toBe('tx-2');
    });

    it('should open mobile fast entry sheet for new transaction', () => {
        component.openNewTransactionMobile();
        expect(component.isMobileEntrySheetOpen()).toBe(true);
        expect(component.editingTransaction()).toBeNull();
    });

    it('should open mobile fast entry sheet for edit transaction', () => {
        const tx = mockTransactions[0]!;
        component.openEditTransactionMobile(tx);
        expect(component.isMobileEntrySheetOpen()).toBe(true);
        expect(component.editingTransaction()).toEqual(tx);
    });

    it('should open reconciliation dialog', () => {
        component.openReconciliation();
        expect(component.reconciliationOpen()).toBe(true);
    });
});
