import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccountType } from '../../../core/domain/types';
import type { IMnyHeader, IMnyParseResult } from '../../../core/parsers/MNYParser';
import {
    MnyMigrationService,
    type MnyWizardStep
} from '../../../services/import-export/mny-migration.service';
import {
    DEFAULT_MNY_MIGRATION_OPTIONS,
    MnyParseStage,
    type IMnyAuditReport,
    type IMnyMigrationOptions
} from '../../../services/import-export/mny-migration.types';
import { MnyMigrationDialogComponent } from './mny-migration-dialog.component';
import {
    ActiveProgress,
    AuditSummaryReport,
    DomainSelectionTabs,
    InitialDropzone,
    PasswordUnlockPrompt
} from './mny-migration-dialog.component.stories';

const mockSampleParseResult: IMnyParseResult = {
    header: {
        signature: 'MSISAM Database',
        formatVersion: 3,
        passwordVerified: true
    } as unknown as IMnyHeader,
    tables: [],
    accounts: [
        {
            mnyAccountId: 101,
            name: 'Woodgrove Checking',
            abbreviation: 'CHK',
            mnyType: 1,
            mappedType: AccountType.Checking,
            accountNumber: '4091',
            openingBalance: 154200,
            isClosed: false,
            isFavorite: true
        },
        {
            mnyAccountId: 102,
            name: 'High Yield Savings',
            abbreviation: 'SAV',
            mnyType: 2,
            mappedType: AccountType.Savings,
            accountNumber: '8820',
            openingBalance: 520000,
            isClosed: false,
            isFavorite: false
        }
    ],
    categories: [
        {
            mnyCategoryId: 1,
            name: 'Automobile: Fuel',
            level: 2,
            parentCategoryId: 10,
            categoryType: 0
        },
        {
            mnyCategoryId: 2,
            name: 'Salary: Net Pay',
            level: 1,
            parentCategoryId: null,
            categoryType: 1
        }
    ],
    payees: [
        {
            mnyPayeeId: 1,
            name: 'Chevron Gas Station'
        },
        {
            mnyPayeeId: 2,
            name: 'Contoso Software Corp'
        }
    ],
    transactions: [],
    errors: [],
    warnings: []
};

const mockAuditReport: IMnyAuditReport = {
    accountsCreated: 2,
    categoriesMapped: 2,
    payeesEnriched: 2,
    transactionsCommitted: 1420,
    splitsBalanced: 1650,
    pennyDiscrepancy: 0,
    durationMs: 340
};

describe('MnyMigrationDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockService: {
        isOpen: ReturnType<typeof signal<boolean>>;
        step: ReturnType<typeof signal<MnyWizardStep>>;
        file: ReturnType<typeof signal<File | null>>;
        header: ReturnType<typeof signal<IMnyHeader | null>>;
        passwordRequired: ReturnType<typeof signal<boolean>>;
        credentialsVerified: ReturnType<typeof signal<boolean>>;
        tableCount: ReturnType<typeof signal<number>>;
        parseResult: ReturnType<typeof signal<IMnyParseResult | null>>;
        options: ReturnType<typeof signal<IMnyMigrationOptions>>;
        progressStage: ReturnType<typeof signal<MnyParseStage>>;
        progressPercent: ReturnType<typeof signal<number>>;
        currentTable: ReturnType<typeof signal<string | null>>;
        auditReport: ReturnType<typeof signal<IMnyAuditReport | null>>;
        errorMessage: ReturnType<typeof signal<string | null>>;
        open: () => void;
        close: () => void;
        reset: () => void;
        inspectFile: () => Promise<void>;
        verifyCredentials: () => Promise<boolean>;
        executeMigration: () => Promise<IMnyAuditReport>;
    };

    let mockRouter: {
        navigate: (commands: Array<string>) => Promise<boolean>;
    };

    beforeEach(async () => {
        mockService = {
            isOpen: signal(true),
            step: signal<MnyWizardStep>('drop'),
            file: signal<File | null>(new File(['dummy'], 'MoneyFile.mny')),
            header: signal<IMnyHeader | null>(mockSampleParseResult.header),
            passwordRequired: signal(false),
            credentialsVerified: signal(true),
            tableCount: signal(88),
            parseResult: signal<IMnyParseResult | null>(mockSampleParseResult),
            options: signal<IMnyMigrationOptions>({
                ...DEFAULT_MNY_MIGRATION_OPTIONS,
                selectedAccountIds: [101, 102],
                selectedCategoryIds: [1, 2],
                selectedPayeeIds: [1, 2]
            }),
            progressStage: signal(MnyParseStage.Complete),
            progressPercent: signal(100),
            currentTable: signal<string | null>(null),
            auditReport: signal<IMnyAuditReport | null>(null),
            errorMessage: signal<string | null>(null),
            open: () => {},
            close: () => {},
            reset: () => {},
            inspectFile: async () => {},
            verifyCredentials: async () => true,
            executeMigration: async () => mockAuditReport
        };

        mockRouter = {
            navigate: async () => true
        };

        await TestBed.configureTestingModule({
            imports: [MnyMigrationDialogComponent],
            providers: [
                { provide: MnyMigrationService, useValue: mockService },
                { provide: Router, useValue: mockRouter }
            ]
        }).compileComponents();
    });

    it('executes InitialDropzone story interaction test', async () => {
        const fixture: ComponentFixture<MnyMigrationDialogComponent> = TestBed.createComponent(
            MnyMigrationDialogComponent
        );
        mockService.step.set('drop');
        mockService.isOpen.set(true);
        fixture.detectChanges();

        await InitialDropzone.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Microsoft Money Migration Wizard');
        expect(document.body.textContent).toContain('Drag & Drop your Microsoft Money');
    });

    it('executes PasswordUnlockPrompt story interaction test', async () => {
        const fixture: ComponentFixture<MnyMigrationDialogComponent> = TestBed.createComponent(
            MnyMigrationDialogComponent
        );
        mockService.step.set('unlock');
        mockService.isOpen.set(true);
        mockService.passwordRequired.set(true);
        fixture.detectChanges();

        await PasswordUnlockPrompt.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Protected Database Detected');
        expect(document.body.textContent).toContain('Standard Money Password');
    });

    it('executes DomainSelectionTabs story interaction test', async () => {
        const fixture: ComponentFixture<MnyMigrationDialogComponent> = TestBed.createComponent(
            MnyMigrationDialogComponent
        );
        mockService.step.set('select');
        mockService.isOpen.set(true);
        mockService.parseResult.set(mockSampleParseResult);
        fixture.componentInstance.activeTab.set('accounts');
        fixture.detectChanges();

        await DomainSelectionTabs.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Woodgrove Checking');
        expect(document.body.textContent).toContain('High Yield Savings');
    });

    it('executes ActiveProgress story interaction test', async () => {
        const fixture: ComponentFixture<MnyMigrationDialogComponent> = TestBed.createComponent(
            MnyMigrationDialogComponent
        );
        mockService.step.set('migrating');
        mockService.isOpen.set(true);
        mockService.progressPercent.set(70);
        mockService.progressStage.set(MnyParseStage.ExtractingTransactions);
        mockService.currentTable.set('TRN');
        fixture.detectChanges();

        await ActiveProgress.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain(
            'Migrating & Reconciling Microsoft Money Ledger...'
        );
    });

    it('executes AuditSummaryReport story interaction test', async () => {
        const fixture: ComponentFixture<MnyMigrationDialogComponent> = TestBed.createComponent(
            MnyMigrationDialogComponent
        );
        mockService.step.set('report');
        mockService.isOpen.set(true);
        mockService.auditReport.set(mockAuditReport);
        fixture.detectChanges();

        await AuditSummaryReport.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Migration Reconciled Successfully!');
        expect(document.body.textContent).toContain('1420');
        expect(document.body.textContent).toContain('Penny Discrepancy (100% Balanced)');
    });
});
