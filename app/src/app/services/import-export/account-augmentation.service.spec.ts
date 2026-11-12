import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AccountType,
    QifClearedStatus,
    TransactionStatus,
    type IAccount,
    type ISODateString,
    type ITransaction
} from '../../core/domain/types';
import type { IMnyParseResult } from '../../core/parsers/MNYParser';
import { LedgerStore } from '../ledger-store/ledger.store';
import {
    AccountAugmentationService,
    AccountHealthStatus,
    AugmentationReviewDecision,
    AugmentationWizardFlow
} from './account-augmentation.service';

vi.mock('../../lib/storage/SQLiteAdapter', () => ({
    getDb: vi.fn().mockReturnValue(null),
    insertTransactions: vi.fn(),
    updateAccount: vi.fn(),
    getAllAccounts: vi.fn().mockReturnValue([]),
    getAllTransactions: vi.fn().mockReturnValue([])
}));

describe('AccountAugmentationService', () => {
    let service: AccountAugmentationService;

    const mockChecking: IAccount = {
        id: 'acct-checking',
        name: 'Primary Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 500000,
        pendingBalance: 500000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    const mockAutoLoan: IAccount = {
        id: 'acct-auto',
        name: 'Honda Auto Loan',
        type: AccountType.AutoLoan,
        institutionName: 'Honda Financial',
        clearedBalance: -1500000,
        pendingBalance: -1500000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    const mockMortgage: IAccount = {
        id: 'acct-mortgage',
        name: 'Home Mortgage',
        type: AccountType.Mortgage,
        institutionName: 'Wells Fargo',
        clearedBalance: -25000000,
        pendingBalance: -25000000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    const mockCreditCard: IAccount = {
        id: 'acct-cc',
        name: 'Sapphire Reserve',
        type: AccountType.Credit,
        institutionName: 'Chase',
        clearedBalance: -120000,
        pendingBalance: -120000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    const mockClosedAccount: IAccount = {
        id: 'acct-closed',
        name: 'Old Savings',
        type: AccountType.Savings,
        institutionName: 'Suburban Bank',
        clearedBalance: 0,
        pendingBalance: 0,
        isActive: false,
        createdAt: '2020-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2020-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    beforeEach(() => {
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
        TestBed.configureTestingModule({
            providers: [AccountAugmentationService, LedgerStore]
        });
        service = TestBed.inject(AccountAugmentationService);
    });

    it('detects closed accounts, stale accounts needing data upload, and reconciled augmentation opportunities', () => {
        const transactions: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acct-checking',
                payeeId: 'p-1',
                payee: 'Payment to Honda Auto Loan',
                date: '2026-10-15' as ISODateString,
                memo: '[Honda Auto Loan]',
                totalAmount: -45000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
                checkNumber: null,
                importHash: 'h-1',
                createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
            },
            {
                id: 'tx-2',
                accountId: 'acct-checking',
                payeeId: 'p-2',
                payee: 'Transfer to Home Mortgage',
                date: '2026-10-01' as ISODateString,
                memo: '[Home Mortgage]',
                totalAmount: -185000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-2', categoryId: null, memo: '', amount: -185000 }],
                checkNumber: null,
                importHash: 'h-2',
                createdAt: '2026-10-01T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-01T00:00:00.000Z' as ISODateString
            }
        ];

        const report = service.analyzeLedgerAccounts(
            [mockChecking, mockAutoLoan, mockMortgage, mockClosedAccount],
            transactions,
            true
        );

        expect(service.isNotificationDialogOpen()).toBe(true);
        expect(report.closedAccounts.length).toBe(1);
        expect(report.needsUploadAccounts.length).toBe(2);
        expect(report.opportunities.length).toBe(2);

        const sourceOpps = service.getSourceOpportunitiesForAccount('acct-checking');
        expect(sourceOpps.length).toBe(2);

        // <= 2 destination accounts should list their names explicitly in the source banner message
        const sourceMsgTwo = service.formatSourceBannerMessage(sourceOpps);
        expect(sourceMsgTwo).toContain('Honda Auto Loan and Home Mortgage');
    });

    it('uses a general message in the source banner when > 2 accounts can be augmented from the source account', () => {
        const transactions: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acct-checking',
                payeeId: 'p-1',
                payee: 'Honda Auto Loan',
                date: '2026-10-15' as ISODateString,
                memo: '[Honda Auto Loan]',
                totalAmount: -45000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
                checkNumber: null,
                importHash: 'h-1',
                createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
            },
            {
                id: 'tx-2',
                accountId: 'acct-checking',
                payeeId: 'p-2',
                payee: 'Home Mortgage',
                date: '2026-10-10' as ISODateString,
                memo: '[Home Mortgage]',
                totalAmount: -185000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-2', categoryId: null, memo: '', amount: -185000 }],
                checkNumber: null,
                importHash: 'h-2',
                createdAt: '2026-10-10T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-10T00:00:00.000Z' as ISODateString
            },
            {
                id: 'tx-3',
                accountId: 'acct-checking',
                payeeId: 'p-3',
                payee: 'Sapphire Reserve Payment',
                date: '2026-10-12' as ISODateString,
                memo: '[Sapphire Reserve]',
                totalAmount: -65000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-3', categoryId: null, memo: '', amount: -65000 }],
                checkNumber: null,
                importHash: 'h-3',
                createdAt: '2026-10-12T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-12T00:00:00.000Z' as ISODateString
            }
        ];

        service.analyzeLedgerAccounts(
            [mockChecking, mockAutoLoan, mockMortgage, mockCreditCard],
            transactions,
            false
        );

        const sourceOpps = service.getSourceOpportunitiesForAccount('acct-checking');
        expect(sourceOpps.length).toBe(3);

        const sourceMsgThree = service.formatSourceBannerMessage(sourceOpps);
        expect(sourceMsgThree).toContain('3 accounts across your workspace');
        expect(sourceMsgThree).not.toContain('Honda Auto Loan');
    });

    it('supports multi-step source -> destination 1...n wizard flow with Skip, Dismiss, and Accept', async () => {
        const ledgerStore = TestBed.inject(LedgerStore);
        ledgerStore.accounts.set([mockChecking, mockAutoLoan, mockMortgage]);
        const initialTxs: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acct-checking',
                payeeId: 'p-1',
                payee: 'Honda Auto Loan',
                date: '2026-10-15' as ISODateString,
                memo: '[Honda Auto Loan]',
                totalAmount: -45000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
                checkNumber: null,
                importHash: 'h-1',
                createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
            },
            {
                id: 'tx-2',
                accountId: 'acct-checking',
                payeeId: 'p-2',
                payee: 'Home Mortgage',
                date: '2026-10-10' as ISODateString,
                memo: '[Home Mortgage]',
                totalAmount: -185000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-2', categoryId: null, memo: '', amount: -185000 }],
                checkNumber: null,
                importHash: 'h-2',
                createdAt: '2026-10-10T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-10T00:00:00.000Z' as ISODateString
            }
        ];
        ledgerStore.transactions.set(initialTxs);

        service.analyzeLedgerAccounts(
            [mockChecking, mockAutoLoan, mockMortgage],
            initialTxs,
            false
        );
        service.openWizardForSource('acct-checking');

        expect(service.isWizardOpen()).toBe(true);
        expect(service.wizardFlow()).toBe(AugmentationWizardFlow.SourceToDestinations);
        expect(service.wizardSteps().length).toBe(2);
        expect(service.currentStepIndex()).toBe(0);

        // Skip step 0 (Honda Auto Loan) -> advances to step 1 (Home Mortgage)
        service.skipCurrentStep();
        expect(service.currentStepIndex()).toBe(1);
        expect(service.currentWizardStep()?.destinationAccountId).toBe('acct-mortgage');

        // Accept step 1 (Home Mortgage) -> creates inverted +185000 counter-entry in Home Mortgage
        await service.acceptCurrentStep();
        const mortgageTxs = ledgerStore.transactions().filter(t => t.accountId === 'acct-mortgage');
        expect(mortgageTxs.length).toBe(1);
        expect(mortgageTxs[0]?.totalAmount).toBe(185000);
        expect(service.isWizardOpen()).toBe(false);
    });

    it('supports single-step reverse destination <- source flow using the same wizard state', () => {
        const initialTxs: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acct-checking',
                payeeId: 'p-1',
                payee: 'Honda Auto Loan',
                date: '2026-10-15' as ISODateString,
                memo: '[Honda Auto Loan]',
                totalAmount: -45000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
                checkNumber: null,
                importHash: 'h-1',
                createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
            }
        ];

        service.analyzeLedgerAccounts([mockChecking, mockAutoLoan], initialTxs, false);
        service.openWizardForDestination('acct-auto', 'acct-checking');

        expect(service.isWizardOpen()).toBe(true);
        expect(service.wizardFlow()).toBe(AugmentationWizardFlow.DestinationFromSource);
        expect(service.wizardSteps().length).toBe(1);
        expect(service.currentWizardStep()?.destinationAccountId).toBe('acct-auto');

        // Dismissing removes it from active destination opportunities
        service.dismissCurrentStep();
        expect(service.isWizardOpen()).toBe(false);
        expect(service.getDestinationOpportunitiesForAccount('acct-auto').length).toBe(0);
    });

    it('analyzes MS Money preview parse results for Step 3 of the Migration Wizard', () => {
        const parseResult: IMnyParseResult = {
            header: null,
            tables: [],
            accounts: [
                {
                    mnyAccountId: 1,
                    name: 'Main Checking',
                    abbreviation: null,
                    mnyType: 0,
                    mappedType: AccountType.Checking,
                    openingBalance: 100000,
                    accountNumber: null,
                    isClosed: false,
                    isFavorite: true
                },
                {
                    mnyAccountId: 2,
                    name: 'Auto Loan',
                    abbreviation: null,
                    mnyType: 5,
                    mappedType: AccountType.AutoLoan,
                    openingBalance: -1000000,
                    accountNumber: null,
                    isClosed: false,
                    isFavorite: false
                }
            ],
            categories: [],
            payees: [],
            transactions: [
                {
                    mnyTransactionId: 100,
                    mnyAccountId: 1,
                    accountName: 'Main Checking',
                    linkedMnyAccountId: 2,
                    date: '2026-10-01' as ISODateString,
                    amount: -35000,
                    payee: 'Auto Loan Payment',
                    memo: '',
                    category: null,
                    checkNumber: null,
                    clearedStatus: QifClearedStatus.Reconciled,
                    splits: [{ amount: -35000, category: null, memo: null }],
                    importHash: 'hash-100'
                }
            ],
            errors: [],
            warnings: []
        };

        const previewMap = service.analyzeMnyPreview(parseResult);
        const checkingAssessment = previewMap.get(1);
        const loanAssessment = previewMap.get(2);

        expect(checkingAssessment?.healthStatus).toBe(AccountHealthStatus.ActiveCurrent);
        expect(checkingAssessment?.canAugmentTargetNames).toContain('Auto Loan');

        expect(loanAssessment?.healthStatus).toBe(AccountHealthStatus.NeedsDataUpload);
        expect(loanAssessment?.canBeAugmentedFromNames).toContain('Main Checking');
    });

    it('records the individual review decision and returns to the notification summary dialog without immediately completing migration', async () => {
        const ledgerStore = TestBed.inject(LedgerStore);
        ledgerStore.accounts.set([mockChecking, mockAutoLoan, mockMortgage]);
        const initialTxs: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acct-checking',
                payeeId: 'p-1',
                payee: 'Honda Auto Loan',
                date: '2026-10-15' as ISODateString,
                memo: '[Honda Auto Loan]',
                totalAmount: -45000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
                checkNumber: null,
                importHash: 'h-1',
                createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
            },
            {
                id: 'tx-2',
                accountId: 'acct-checking',
                payeeId: 'p-2',
                payee: 'Home Mortgage',
                date: '2026-10-10' as ISODateString,
                memo: '[Home Mortgage]',
                totalAmount: -185000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-2', categoryId: null, memo: '', amount: -185000 }],
                checkNumber: null,
                importHash: 'h-2',
                createdAt: '2026-10-10T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-10T00:00:00.000Z' as ISODateString
            }
        ];
        ledgerStore.transactions.set(initialTxs);

        const report = service.analyzeLedgerAccounts(
            [mockChecking, mockAutoLoan, mockMortgage],
            initialTxs,
            true
        );

        // Opportunities default to Skip
        expect(report.opportunities[0]?.reviewDecision).toBe(AugmentationReviewDecision.Skip);
        expect(report.opportunities[1]?.reviewDecision).toBe(AugmentationReviewDecision.Skip);

        const autoOppId = report.opportunities.find(
            o => o.destinationAccountId === 'acct-auto'
        )!.id;
        service.openReviewFromNotification(autoOppId);

        // Individual review popup is open and notification dialog is temporarily hidden
        expect(service.isWizardOpen()).toBe(true);
        expect(service.isNotificationDialogOpen()).toBe(false);
        expect(service.returnToNotificationOnClose()).toBe(true);

        // Clicking Accept in the individual review popup records the decision, closes the popup, and re-activates the summary dialog
        await service.acceptCurrentStep();
        expect(service.isWizardOpen()).toBe(false);
        expect(service.isNotificationDialogOpen()).toBe(true);
        const updatedOpp = service
            .intelligenceReport()
            ?.opportunities.find(o => o.id === autoOppId);
        expect(updatedOpp?.reviewDecision).toBe(AugmentationReviewDecision.Accept);

        // No transactions have been committed yet until the user applies/executes from the summary dialog
        expect(ledgerStore.transactions().filter(t => t.accountId === 'acct-auto').length).toBe(0);

        await service.applyNotificationReviewDecisions();
        expect(service.isNotificationDialogOpen()).toBe(false);
        expect(ledgerStore.transactions().filter(t => t.accountId === 'acct-auto').length).toBe(1);
    });

    it('supports bulk Accept & Update All, Skip All, and Dismiss All without reviewing each account 1 by 1', async () => {
        const ledgerStore = TestBed.inject(LedgerStore);
        ledgerStore.accounts.set([mockChecking, mockAutoLoan, mockMortgage]);
        const initialTxs: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acct-checking',
                payeeId: 'p-1',
                payee: 'Honda Auto Loan',
                date: '2026-10-15' as ISODateString,
                memo: '[Honda Auto Loan]',
                totalAmount: -45000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
                checkNumber: null,
                importHash: 'h-1',
                createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
            },
            {
                id: 'tx-2',
                accountId: 'acct-checking',
                payeeId: 'p-2',
                payee: 'Home Mortgage',
                date: '2026-10-10' as ISODateString,
                memo: '[Home Mortgage]',
                totalAmount: -185000,
                status: TransactionStatus.Reconciled,
                splits: [{ id: 's-2', categoryId: null, memo: '', amount: -185000 }],
                checkNumber: null,
                importHash: 'h-2',
                createdAt: '2026-10-10T00:00:00.000Z' as ISODateString,
                updatedAt: '2026-10-10T00:00:00.000Z' as ISODateString
            }
        ];
        ledgerStore.transactions.set(initialTxs);

        service.analyzeLedgerAccounts([mockChecking, mockAutoLoan, mockMortgage], initialTxs, true);
        service.setAllOpportunitiesReviewDecision(AugmentationReviewDecision.Accept);
        await service.applyNotificationReviewDecisions();

        expect(ledgerStore.transactions().filter(t => t.accountId === 'acct-auto').length).toBe(1);
        expect(ledgerStore.transactions().filter(t => t.accountId === 'acct-mortgage').length).toBe(
            1
        );
    });
});
