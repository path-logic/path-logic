import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    type ISODateString
} from '../../../core/domain/types';
import type { IMnyAccount, IMnyHeader, IMnyParseResult } from '../../../core/parsers/MNYParser';
import {
    MnyMigrationService,
    type MnyWizardStep
} from '../../../services/import-export/mny-migration.service';
import {
    DEFAULT_MNY_MIGRATION_OPTIONS,
    MnyMigrationMode,
    MnyParseStage,
    type IMnyAuditReport,
    type IMnyMigrationOptions
} from '../../../services/import-export/mny-migration.types';
import { MnyMigrationDialogComponent } from './mny-migration-dialog.component';

describe('MnyMigrationDialogComponent', () => {
    let component: MnyMigrationDialogComponent;

    let mockService: {
        isOpen: ReturnType<typeof signal<boolean>>;
        step: ReturnType<typeof signal<MnyWizardStep>>;
        file: ReturnType<typeof signal<File | null>>;
        header: ReturnType<typeof signal<IMnyHeader | null>>;
        passwordRequired: ReturnType<typeof signal<boolean>>;
        parseResult: ReturnType<typeof signal<IMnyParseResult | null>>;
        options: ReturnType<typeof signal<IMnyMigrationOptions>>;
        progressStage: ReturnType<typeof signal<MnyParseStage>>;
        progressPercent: ReturnType<typeof signal<number>>;
        currentTable: ReturnType<typeof signal<string | null>>;
        auditReport: ReturnType<typeof signal<IMnyAuditReport | null>>;
        errorMessage: ReturnType<typeof signal<string | null>>;
        open: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
        reset: ReturnType<typeof vi.fn>;
        inspectFile: ReturnType<typeof vi.fn>;
        verifyCredentials: ReturnType<typeof vi.fn>;
        executeMigration: ReturnType<typeof vi.fn>;
    };

    let mockRouter: {
        navigate: ReturnType<typeof vi.fn>;
    };

    const mockParseResult: IMnyParseResult = {
        header: {
            signature: 'MSISAM Database',
            formatVersion: 3,
            passwordVerified: true
        } as unknown as IMnyHeader,
        tables: [],
        accounts: [
            {
                mnyAccountId: 1,
                name: 'Zebra Checking',
                abbreviation: 'ZCHK',
                mnyType: 1,
                mappedType: AccountType.Checking,
                accountNumber: '1234',
                openingBalance: 10000,
                isClosed: false,
                isFavorite: true
            },
            {
                mnyAccountId: 2,
                name: 'Beta Closed 401(k)',
                abbreviation: 'B401',
                mnyType: 2,
                mappedType: AccountType.Savings,
                accountNumber: '5678',
                openingBalance: 50000,
                isClosed: true,
                isFavorite: false
            },
            {
                mnyAccountId: 3,
                name: 'Apple Savings',
                abbreviation: 'ASAV',
                mnyType: 2,
                mappedType: AccountType.Savings,
                accountNumber: '9999',
                openingBalance: 25000,
                isClosed: false,
                isFavorite: false
            },
            {
                mnyAccountId: 4,
                name: 'Alpha Closed Visa',
                abbreviation: 'AVIS',
                mnyType: 3,
                mappedType: AccountType.Credit,
                accountNumber: '0001',
                openingBalance: -1500,
                isClosed: true,
                isFavorite: false
            }
        ],
        categories: [
            {
                mnyCategoryId: 10,
                name: 'Groceries',
                level: 1,
                parentCategoryId: null,
                categoryType: 0
            },
            {
                mnyCategoryId: 11,
                name: 'Salary',
                level: 1,
                parentCategoryId: null,
                categoryType: 1
            },
            {
                mnyCategoryId: 12,
                name: 'Bonus',
                level: 1,
                parentCategoryId: null,
                categoryType: 1
            },
            {
                mnyCategoryId: 13,
                name: 'Auto',
                level: 1,
                parentCategoryId: null,
                categoryType: 0
            },
            {
                mnyCategoryId: 14,
                name: 'Auto : Fuel',
                level: 2,
                parentCategoryId: 13,
                categoryType: 0
            }
        ],
        payees: [
            {
                mnyPayeeId: 100,
                name: 'Whole Foods Market'
            },
            {
                mnyPayeeId: 101,
                name: 'AMZN MKTP US*2X1Y4'
            },
            {
                mnyPayeeId: 102,
                name: 'Apple Store #0412'
            }
        ],
        transactions: [],
        errors: [],
        warnings: []
    };

    beforeEach(() => {
        mockService = {
            isOpen: signal<boolean>(true),
            step: signal<MnyWizardStep>('mode'),
            file: signal<File | null>(null),
            header: signal<IMnyHeader | null>(null),
            passwordRequired: signal<boolean>(false),
            parseResult: signal<IMnyParseResult | null>(mockParseResult),
            options: signal<IMnyMigrationOptions>({
                ...DEFAULT_MNY_MIGRATION_OPTIONS,
                includeClosedAccounts: true,
                selectedAccountIds: [1, 2, 3, 4],
                selectedCategoryIds: [10, 11, 12, 13, 14],
                selectedPayeeIds: [100, 101, 102]
            }),
            progressStage: signal<MnyParseStage>(MnyParseStage.Complete),
            progressPercent: signal<number>(100),
            currentTable: signal<string | null>(null),
            auditReport: signal<IMnyAuditReport | null>(null),
            errorMessage: signal<string | null>(null),
            open: vi.fn(),
            close: vi.fn(),
            reset: vi.fn(),
            inspectFile: vi.fn().mockResolvedValue(undefined),
            verifyCredentials: vi.fn().mockResolvedValue(true),
            executeMigration: vi.fn().mockResolvedValue({
                accountsCreated: 4,
                categoriesMapped: 5,
                payeesEnriched: 3,
                transactionsCommitted: 40,
                splitsBalanced: 45,
                pennyDiscrepancy: 0,
                durationMs: 120
            })
        };

        mockRouter = {
            navigate: vi.fn().mockResolvedValue(true)
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: MnyMigrationService, useValue: mockService },
                { provide: Router, useValue: mockRouter }
            ]
        });

        // Instantiate component with injected mock dependencies
        component = TestBed.runInInjectionContext(() => new MnyMigrationDialogComponent());
    });

    describe('State and Computations', () => {
        it('should compute selected counts correctly', () => {
            expect(component.totalAccountsCount()).toBe(4);
            expect(component.selectedAccountsCount()).toBe(4);
            expect(component.allAccountsSelected()).toBe(true);

            expect(component.totalCategoriesCount()).toBe(5);
            expect(component.selectedCategoriesCount()).toBe(5);
            expect(component.allCategoriesSelected()).toBe(true);

            expect(component.totalPayeesCount()).toBe(3);
            expect(component.selectedPayeesCount()).toBe(3);
            expect(component.allPayeesSelected()).toBe(true);
        });

        it('should update active tab on demand', () => {
            expect(component.activeTab()).toBe('accounts');
            component.setActiveTab('categories');
            expect(component.activeTab()).toBe('categories');
            component.setActiveTab('payees');
            expect(component.activeTab()).toBe('payees');
            component.setActiveTab('options');
            expect(component.activeTab()).toBe('options');
        });
    });

    describe('Account Selection Handlers', () => {
        it('should toggle single account selection correctly', () => {
            expect(component.isAccountSelected(1)).toBe(true);
            component.toggleAccountSelection(1);
            expect(component.isAccountSelected(1)).toBe(false);
            expect(component.selectedAccountsCount()).toBe(3);

            component.toggleAccountSelection(1);
            expect(component.isAccountSelected(1)).toBe(true);
            expect(component.selectedAccountsCount()).toBe(4);
        });

        it('should toggle all accounts selection between all and none', () => {
            expect(component.allAccountsSelected()).toBe(true);
            component.toggleAllAccounts();
            expect(component.selectedAccountsCount()).toBe(0);
            expect(component.allAccountsSelected()).toBe(false);

            component.toggleAllAccounts();
            expect(component.selectedAccountsCount()).toBe(4);
            expect(component.allAccountsSelected()).toBe(true);
        });

        it('should toggle includeClosedAccounts option', () => {
            expect(component.options().includeClosedAccounts).toBe(true);
            component.toggleIncludeClosedAccounts();
            expect(component.options().includeClosedAccounts).toBe(false);
        });

        it('should filter out closed accounts when includeClosedAccounts is false', () => {
            mockService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    includeClosedAccounts: false
                })
            );

            const visible = component.visibleAccounts();
            expect(visible.length).toBe(2);
            expect(visible.every((a: IMnyAccount): boolean => !a.isClosed)).toBe(true);
            // Open accounts sorted in ascending alphabetical order
            expect(visible.map((a: IMnyAccount): string => a.name)).toEqual([
                'Apple Savings',
                'Zebra Checking'
            ]);
        });

        it('should list open accounts first sorted asc, followed by closed accounts sorted asc when includeClosedAccounts is true', () => {
            mockService.options.update(
                (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                    ...opt,
                    includeClosedAccounts: true
                })
            );

            const visible = component.visibleAccounts();
            expect(visible.length).toBe(4);
            expect(visible.map((a: IMnyAccount): string => a.name)).toEqual([
                'Apple Savings',
                'Zebra Checking',
                'Alpha Closed Visa',
                'Beta Closed 401(k)'
            ]);
        });

        it('should group accounts by Path Logic AccountType and support group selection and collapse', () => {
            const groups = component.accountTypeGroups();
            expect(groups.map(g => g.accountType)).toEqual([
                AccountType.Checking,
                AccountType.Savings,
                AccountType.Credit
            ]);
            expect(groups[0]?.accounts.map(a => a.name)).toEqual(['Zebra Checking']);
            expect(groups[1]?.accounts.map(a => a.name)).toEqual([
                'Apple Savings',
                'Beta Closed 401(k)'
            ]);
            expect(groups[2]?.accounts.map(a => a.name)).toEqual(['Alpha Closed Visa']);

            expect(component.isAccountTypeGroupAllSelected(AccountType.Savings)).toBe(true);
            component.toggleAccountTypeGroup(AccountType.Savings);
            expect(component.isAccountTypeGroupAllSelected(AccountType.Savings)).toBe(false);
            expect(component.isAccountSelected(2)).toBe(false);
            expect(component.isAccountSelected(3)).toBe(false);
            expect(component.isAccountSelected(1)).toBe(true);

            component.toggleAccountTypeGroup(AccountType.Savings);
            expect(component.isAccountTypeGroupAllSelected(AccountType.Savings)).toBe(true);

            expect(component.isAccountTypeGroupCollapsed(AccountType.Savings)).toBe(false);
            component.toggleAccountTypeGroupCollapse(AccountType.Savings);
            expect(component.isAccountTypeGroupCollapsed(AccountType.Savings)).toBe(true);
        });

        it('should mark Unlock step as skipped/not needed when passwordRequired is false after file inspection', () => {
            mockService.step.set('drop');
            mockService.passwordRequired.set(false);
            expect(component.isUnlockSkipped()).toBe(false);

            mockService.step.set('mode');
            expect(component.isUnlockSkipped()).toBe(true);

            mockService.step.set('select');
            expect(component.isUnlockSkipped()).toBe(true);

            mockService.passwordRequired.set(true);
            expect(component.isUnlockSkipped()).toBe(false);
        });
    });

    describe('Category & Payee Selection Handlers', () => {
        it('should toggle categories correctly', () => {
            expect(component.isCategorySelected(10)).toBe(true);
            component.toggleCategorySelection(10);
            expect(component.isCategorySelected(10)).toBe(false);

            component.toggleAllCategories();
            expect(component.selectedCategoriesCount()).toBe(5);
        });

        it('should build nested category hierarchy grouped by Income and Expense and sorted asc', () => {
            const groups = component.categoryTreeGroups();
            expect(groups.length).toBe(2);

            const incomeGroup = groups.find(g => g.type === 'Income');
            const expenseGroup = groups.find(g => g.type === 'Expense');

            expect(incomeGroup).toBeDefined();
            expect(expenseGroup).toBeDefined();

            // Income group sorted asc
            const incomeNames = incomeGroup!.nodes.map(n => n.name);
            expect(incomeNames).toEqual(['Bonus', 'Salary']);

            // Expense group sorted asc with nested child under Auto
            const expenseNames = expenseGroup!.nodes.map(n => n.name);
            expect(expenseNames).toEqual(['Auto', 'Auto : Fuel', 'Groceries']);

            // Auto : Fuel is a child of Auto with level 1
            const autoNode = expenseGroup!.nodes.find(n => n.name === 'Auto');
            const fuelNode = expenseGroup!.nodes.find(n => n.name === 'Auto : Fuel');
            expect(autoNode?.level).toBe(0);
            expect(autoNode?.hasChildren).toBe(true);
            expect(autoNode?.childCount).toBe(1);
            expect(fuelNode?.level).toBe(1);
        });

        it('should toggle category group selection', () => {
            expect(component.isCategoryGroupAllSelected('Income')).toBe(true);
            component.toggleCategoryGroup('Income');
            expect(component.isCategoryGroupAllSelected('Income')).toBe(false);

            component.toggleCategoryGroup('Income');
            expect(component.isCategoryGroupAllSelected('Income')).toBe(true);
        });

        it('should sort payees in ascending alphabetical order and include AI cleaned names', () => {
            const payees = component.sortedPayees();
            expect(payees.length).toBe(3);
            expect(payees.map(p => p.name)).toEqual([
                'AMZN MKTP US*2X1Y4',
                'Apple Store #0412',
                'Whole Foods Market'
            ]);

            // Cleaned name generated for noisy Amazon string
            const amzn = payees.find(p => p.mnyPayeeId === 101);
            expect(amzn?.cleanedName).toBe('Amazon');
        });

        it('should toggle payees correctly', () => {
            expect(component.isPayeeSelected(100)).toBe(true);
            component.togglePayeeSelection(100);
            expect(component.isPayeeSelected(100)).toBe(false);

            component.toggleAllPayees();
            expect(component.selectedPayeesCount()).toBe(3);
        });

        it('should reconcile and collapse duplicate and near-duplicate payees when aiEnhancePayees is enabled', () => {
            mockService.parseResult.set({
                ...mockParseResult,
                payees: [
                    { mnyPayeeId: 201, name: '.American Express Ft Lauderda' },
                    { mnyPayeeId: 202, name: '.American Express Ft Lauderdale' },
                    { mnyPayeeId: 203, name: '.Hsbc Retail Services City Of In' }
                ]
            });
            mockService.options.update(opt => ({
                ...opt,
                aiEnhancePayees: true,
                selectedPayeeIds: [201, 202, 203]
            }));

            const payees = component.sortedPayees();
            expect(payees.length).toBe(2);
            expect(component.reconciledDuplicatesCount()).toBe(1);

            const amexGroup = payees.find(p => p.canonicalName === 'American Express');
            expect(amexGroup).toBeDefined();
            expect(amexGroup?.isReconciledDuplicate).toBe(true);
            expect(amexGroup?.mergedCount).toBe(2);
            expect(amexGroup?.mergedPayeeIds).toEqual([201, 202]);

            // Toggling the reconciled group toggles both underlying mnyPayeeIds
            component.togglePayeeSelection(201, amexGroup?.mergedPayeeIds);
            expect(component.isPayeeSelected(201)).toBe(false);
            expect(component.isPayeeSelected(202)).toBe(false);
            expect(component.isPayeeSelected(203)).toBe(true);
        });

        it('should toggle AI normalization options', () => {
            expect(component.options().aiEnhanceCategories).toBe(true);
            component.toggleAiEnhanceCategories();
            expect(component.options().aiEnhanceCategories).toBe(false);

            expect(component.options().aiEnhancePayees).toBe(true);
            component.toggleAiEnhancePayees();
            expect(component.options().aiEnhancePayees).toBe(false);
        });

        it('should group payees into MS Money Primary Payees first followed by originating account groups', () => {
            mockService.parseResult.set({
                ...mockParseResult,
                payees: [
                    {
                        mnyPayeeId: 301,
                        name: '1-800 Contacts',
                        isHidden: false,
                        accountNames: ['Chase Bank']
                    },
                    {
                        mnyPayeeId: 302,
                        name: 'Amazon',
                        isHidden: false,
                        accountNames: ['Chase Bank']
                    },
                    {
                        mnyPayeeId: 303,
                        name: 'A BARGAIN LOCKSMITH',
                        isHidden: true,
                        accountNames: ['American Express Gold Rewards'],
                        transactionCount: 1
                    }
                ]
            });
            mockService.options.update(opt => ({
                ...opt,
                aiEnhancePayees: true,
                selectedPayeeIds: [301, 302, 303]
            }));

            const acctGroups = component.payeeAccountGroups();
            expect(acctGroups.length).toBe(2);
            expect(acctGroups[0]?.isPrimaryGroup).toBe(true);
            expect(acctGroups[0]?.payees.map(p => p.canonicalName)).toEqual([
                '1-800 Contacts',
                'Amazon'
            ]);
            expect(acctGroups[1]?.groupTitle).toBe('American Express Gold Rewards');
            expect(acctGroups[1]?.payees.length).toBe(1);

            // Toggle group selection on the account group
            component.togglePayeeAccountGroup(acctGroups[1]!.groupKey);
            expect(component.isPayeeSelected(303)).toBe(false);
            expect(component.isPayeeSelected(301)).toBe(true);
        });

        it('should manage recurring schedules selection and toggleAllRecurringSchedules', () => {
            mockService.parseResult.set({
                ...mockParseResult,
                recurringSchedules: [
                    {
                        mnyBillHeadId: 500,
                        mnyBillId: 501,
                        mnyTransactionId: 9001,
                        mnyAccountId: 1,
                        accountName: 'Zebra Checking',
                        linkedMnyAccountId: null,
                        payee: 'Paramount+',
                        amount: -1416,
                        isEstimatedAmount: false,
                        type: ScheduleType.Debit,
                        frequency: Frequency.Monthly,
                        frequencyLabel: 'Monthly',
                        paymentMethod: PaymentMethod.ElectronicTransfer,
                        paymentMethodLabel: 'Auto Enter',
                        startDate: '2026-01-25' as ISODateString,
                        endDate: null,
                        nextDueDate: '2026-08-25' as ISODateString,
                        memo: '',
                        category: 'Bills : Streaming Service',
                        mnyCategoryId: 10,
                        splits: []
                    }
                ]
            });
            mockService.options.update(opt => ({
                ...opt,
                selectedRecurringScheduleIds: [500]
            }));

            expect(component.totalRecurringSchedulesCount()).toBe(1);
            expect(component.selectedRecurringSchedulesCount()).toBe(1);
            expect(component.allRecurringSchedulesSelected()).toBe(true);

            component.toggleRecurringScheduleSelection(500);
            expect(component.isRecurringScheduleSelected(500)).toBe(false);
            expect(component.selectedRecurringSchedulesCount()).toBe(0);

            component.toggleAllRecurringSchedules();
            expect(component.selectedRecurringSchedulesCount()).toBe(1);
        });
    });

    describe('Contextual Options Toggles', () => {
        it('should toggle preserveClearedStatus, importDecryptedAccountNumbers, and synthesizeOpeningBalances', () => {
            expect(component.options().preserveClearedStatus).toBe(true);
            component.togglePreserveClearedStatus();
            expect(component.options().preserveClearedStatus).toBe(false);

            expect(component.options().importDecryptedAccountNumbers).toBe(true);
            component.toggleImportDecryptedAccountNumbers();
            expect(component.options().importDecryptedAccountNumbers).toBe(false);

            expect(component.options().synthesizeOpeningBalances).toBe(true);
            component.toggleSynthesizeOpeningBalances();
            expect(component.options().synthesizeOpeningBalances).toBe(false);
        });
    });

    describe('Mode and Step Flow', () => {
        it('should switch mode between MergeAndReconcile and ReplaceWorkspace', () => {
            component.setMode(MnyMigrationMode.ReplaceWorkspace);
            expect(component.options().mode).toBe(MnyMigrationMode.ReplaceWorkspace);

            component.setMode(MnyMigrationMode.MergeAndReconcile);
            expect(component.options().mode).toBe(MnyMigrationMode.MergeAndReconcile);
        });

        it('should advance and backtrack between mode and select steps', () => {
            component.goToDomainSelection();
            expect(mockService.step()).toBe('select');

            component.goToModeSelection();
            expect(mockService.step()).toBe('mode');
        });
    });

    describe('Credential Verification Flow', () => {
        it('should call verifyCredentials on migration service with standard password', async () => {
            component.passwordInput.set('my-password');
            component.isLiveIdMode.set(false);

            await component.submitCredentials();

            expect(mockService.verifyCredentials).toHaveBeenCalledWith('my-password', undefined);
        });

        it('should call verifyCredentials on migration service with Live ID email and password', async () => {
            component.usernameInput.set('user@live.com');
            component.passwordInput.set('live-password');
            component.isLiveIdMode.set(true);

            await component.submitCredentials();

            expect(mockService.verifyCredentials).toHaveBeenCalledWith(
                'live-password',
                'user@live.com'
            );
        });
    });

    describe('Migration Execution and Overview Navigation', () => {
        it('should call executeMigration on startMigration() and immediately set step to migrating', async () => {
            await component.startMigration();
            expect(mockService.executeMigration).toHaveBeenCalled();
            expect(component.getStageLabel(MnyParseStage.AiReconciling)).toContain(
                'AI Reconciling'
            );
            expect(component.getStageLabel(MnyParseStage.ExtractingPayees)).toContain(
                'AI Reconciling & Deduplicating Payees'
            );

            mockService.progressStage.set(MnyParseStage.ExtractingPayees);
            mockService.currentTable.set('AI Reconciling & Deduplicating Payees...');
            expect(component.getFormattedCurrentSubstep()).toBeNull();

            mockService.progressStage.set(MnyParseStage.ExtractingAccounts);
            mockService.currentTable.set('Accounts');
            expect(component.getFormattedCurrentSubstep()).toBeNull();

            mockService.progressStage.set(MnyParseStage.ExtractingTransactions);
            mockService.currentTable.set('TRN');
            expect(component.getFormattedCurrentSubstep()).toBe('TRN');
            expect(component.isShortTableSubstep()).toBe(true);

            mockService.currentTable.set('Writing Ledger to SQLite...');
            expect(component.getFormattedCurrentSubstep()).toBe('Writing Ledger to SQLite...');
            expect(component.isShortTableSubstep()).toBe(false);
        });

        it('should handle executeMigration() error by setting errorMessage and stepping back to select', async () => {
            mockService.executeMigration.mockRejectedValueOnce(
                new Error('SQLite constraint violation')
            );
            await component.startMigration();

            expect(mockService.errorMessage()).toBe('SQLite constraint violation');
            expect(mockService.step()).toBe('select');
        });

        it('should close dialog and update visible model signal on close()', () => {
            component.visible.set(true);
            component.close();

            expect(component.visible()).toBe(false);
            expect(mockService.close).toHaveBeenCalled();
        });

        it('should navigate to accounts overview page upon completion', () => {
            component.navigateToOverview();
            expect(mockService.close).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/accounts']);
        });

        it('should format currency and file sizes accurately', () => {
            expect(component.formatCurrency(125050)).toBe('$1,250.50');
            expect(component.formatCurrency(-5000)).toBe('-$50.00');
            expect(component.formatFileSize(500)).toBe('500 B');
            expect(component.formatFileSize(1048576)).toBe('1.00 MB');
            expect(component.formatDuration(45.2)).toBe('45.2 ms');
            expect(component.formatDuration(1391.7)).toBe('1.39 s');
        });

        it('should collapse statement-upload payee groups by default while keeping MS Money Primary Payees expanded, and support selectPrimaryPayeesOnly()', () => {
            mockService.parseResult.set({
                ...mockParseResult,
                payees: [
                    {
                        mnyPayeeId: 301,
                        name: '1-800 Contacts',
                        isHidden: false,
                        accountNames: ['Chase Bank']
                    },
                    {
                        mnyPayeeId: 303,
                        name: 'A BARGAIN LOCKSMITH',
                        isHidden: true,
                        accountNames: ['American Express Gold Rewards'],
                        transactionCount: 1
                    }
                ]
            });
            mockService.options.update(opt => ({
                ...opt,
                aiEnhancePayees: true,
                selectedPayeeIds: [301, 303]
            }));

            expect(component.isPayeeGroupCollapsed('__primary__')).toBe(false);
            expect(component.isPayeeGroupCollapsed('acct::American Express Gold Rewards')).toBe(
                true
            );

            component.togglePayeeGroupCollapse('acct::American Express Gold Rewards');
            expect(component.isPayeeGroupCollapsed('acct::American Express Gold Rewards')).toBe(
                false
            );

            component.selectPrimaryPayeesOnly();
            expect(component.options().selectedPayeeIds).toEqual([301]);
        });

        it('should filter categories and payees via search queries and navigate to forensic inspector', () => {
            component.categorySearchQuery.set('fuel');
            const filteredCatGroups = component.filteredCategoryTreeGroups();
            expect(filteredCatGroups.length).toBe(1);
            expect(filteredCatGroups[0]?.nodes.map(n => n.name)).toEqual(['Auto : Fuel']);

            component.payeeSearchQuery.set('whole foods');
            expect(component.filteredFlatPayees().map(p => p.name)).toEqual(['Whole Foods Market']);

            component.openForensicInspector();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/settings/dev/mny-inspector']);
        });
    });
});
