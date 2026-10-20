import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
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
import { AiAutoCategorizeService } from '../../../services/ai-auto-categorize/ai-auto-categorize.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { SyncService } from '../../../services/sync/sync.service';
import { AccountLedgerComponent } from './account-ledger.component';
import { DesktopView, MobileView } from './account-ledger.component.stories';

describe('AccountLedgerComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockLedgerStore: any;
    let mockSyncService: any;
    let mockAuthService: any;
    let mockImportService: any;
    let mockAiService: any;
    let mockPostHogService: any;

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
        }
    ];

    const mockTransactions: Array<ITransaction> = [
        {
            id: 'tx-1',
            accountId: 'acc-1',
            date: '2026-08-15' as ISODateString,
            payee: 'Whole Foods Market',
            payeeId: 'p-1',
            memo: 'Weekly produce',
            totalAmount: -4250 as Cents,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-1', amount: -4250 as Cents, categoryId: 'c-1', memo: '' }],
            checkNumber: null,
            importHash: 'h-1',
            createdAt: '2026-08-15T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-15T00:00:00Z' as ISODateString
        }
    ];

    beforeEach(async () => {
        mockLedgerStore = {
            isInitialized: signal(true),
            isLoading: signal(false),
            accounts: signal(mockAccounts),
            transactions: signal(mockTransactions),
            payees: signal<Array<IPayee>>([]),
            categories: signal<Array<ICategory>>([]),
            syncStatus: signal('idle'),
            authError: signal(null),
            hasLocalFallback: signal(true),
            deleteTransaction: () => {},
            updateTransaction: () => {},
            applyReconciliationBatch: () => {}
        };

        mockSyncService = {
            isSyncing: signal(false),
            sync: () => {},
            startAutoSync: () => {},
            stopAutoSync: () => {}
        };

        mockAuthService = {
            user: signal(null),
            isAuthenticated: signal(false),
            logout: () => {}
        };

        mockImportService = {
            progress: signal({ stage: 'idle', percent: 0, message: '' }),
            matches: signal([]),
            stats: signal(null),
            unknownCategories: signal<Array<string>>([]),
            handleFile: () => {},
            cancel: () => {},
            reset: () => {}
        };

        mockAiService = {
            status: signal('idle'),
            progress: signal({ pct: 0, processed: 0, total: 0, message: '' }),
            suggestions: signal([]),
            error: signal(null),
            targetTransactions: signal([]),
            startBackgroundCategorization: () => {},
            acceptAll: async () => 0,
            cancel: () => {},
            dismiss: () => {}
        };

        mockPostHogService = {
            capture: () => {},
            identify: () => {},
            reset: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [AccountLedgerComponent],
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: mockLedgerStore },
                { provide: SyncService, useValue: mockSyncService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: AiAutoCategorizeService, useValue: mockAiService },
                { provide: PostHogService, useValue: mockPostHogService }
            ]
        }).compileComponents();
    });

    it('executes DesktopView story interaction test', async () => {
        const fixture: ComponentFixture<AccountLedgerComponent> =
            TestBed.createComponent(AccountLedgerComponent);
        fixture.detectChanges();

        await DesktopView.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Main Checking');
    });

    it('executes MobileView story interaction test', async () => {
        const fixture: ComponentFixture<AccountLedgerComponent> =
            TestBed.createComponent(AccountLedgerComponent);
        fixture.detectChanges();

        await MobileView.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Add Transaction');
    });
});
