import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, within } from 'storybook/test';
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
        },
        {
            mnyAccountId: 103,
            name: 'Old Closed Credit Card',
            abbreviation: 'CC',
            mnyType: 3,
            mappedType: AccountType.Credit,
            accountNumber: '1100',
            openingBalance: 0,
            isClosed: true,
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

function createMockMigrationService(initialStep: MnyWizardStep = 'drop') {
    return {
        isOpen: signal<boolean>(true),
        step: signal<MnyWizardStep>(initialStep),
        file: signal<File | null>(new File(['mny-dummy-bytes'], 'MoneyFile.mny')),
        header: signal<IMnyHeader | null>(mockSampleParseResult.header),
        passwordRequired: signal<boolean>(initialStep === 'unlock'),
        credentialsVerified: signal<boolean>(initialStep !== 'unlock'),
        tableCount: signal<number>(88),
        parseResult: signal<IMnyParseResult | null>(mockSampleParseResult),
        options: signal<IMnyMigrationOptions>({
            ...DEFAULT_MNY_MIGRATION_OPTIONS,
            selectedAccountIds: [101, 102],
            selectedCategoryIds: [1, 2],
            selectedPayeeIds: [1, 2]
        }),
        progressStage: signal<MnyParseStage>(
            initialStep === 'migrating'
                ? MnyParseStage.ExtractingTransactions
                : MnyParseStage.Complete
        ),
        progressPercent: signal<number>(initialStep === 'migrating' ? 65 : 100),
        currentTable: signal<string | null>(initialStep === 'migrating' ? 'TRN' : null),
        auditReport: signal<IMnyAuditReport | null>(
            initialStep === 'report' ? mockAuditReport : null
        ),
        errorMessage: signal<string | null>(null),
        open: () => {},
        close: () => {},
        reset: () => {},
        inspectFile: async () => {},
        verifyCredentials: async () => true,
        executeMigration: async () => mockAuditReport
    };
}

const meta: Meta<MnyMigrationDialogComponent> = {
    title: 'ExportImport/MnyMigrationDialogComponent',
    component: MnyMigrationDialogComponent,
    decorators: [
        applicationConfig({
            providers: [
                {
                    provide: MnyMigrationService,
                    useFactory: () => createMockMigrationService('drop')
                }
            ]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<MnyMigrationDialogComponent>;

export const InitialDropzone: Story = {
    render: args => ({
        props: args,
        onNgInit(comp: MnyMigrationDialogComponent): void {
            comp.migrationService.step.set('drop');
            comp.migrationService.isOpen.set(true);
            comp.migrationService.errorMessage.set(null);
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Microsoft Money Migration Wizard/i)).toBeInTheDocument();
        await expect(body.getByText(/Drag & Drop your Microsoft Money/i)).toBeInTheDocument();
        await expect(body.getByText(/100% Client-Side/i)).toBeInTheDocument();
        await expect(body.getByText(/Penny-Perfect Math/i)).toBeInTheDocument();
    }
};

export const PasswordUnlockPrompt: Story = {
    render: args => ({
        props: args,
        onNgInit(comp: MnyMigrationDialogComponent): void {
            comp.migrationService.step.set('unlock');
            comp.migrationService.isOpen.set(true);
            comp.migrationService.errorMessage.set(null);
            comp.isLiveIdMode.set(false);
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Protected Database Detected/i)).toBeInTheDocument();
        await expect(body.getByText(/Standard Money Password/i)).toBeInTheDocument();
        await expect(body.getByText(/Windows Live ID \(Passport\)/i)).toBeInTheDocument();
        await expect(body.getByRole('button', { name: /Unlock & Inspect/i })).toBeInTheDocument();
    }
};

export const DomainSelectionTabs: Story = {
    render: args => ({
        props: args,
        onNgInit(comp: MnyMigrationDialogComponent): void {
            comp.migrationService.step.set('select');
            comp.migrationService.isOpen.set(true);
            comp.migrationService.parseResult.set(mockSampleParseResult);
            comp.activeTab.set('accounts');
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Woodgrove Checking/i)).toBeInTheDocument();
        await expect(body.getByText(/High Yield Savings/i)).toBeInTheDocument();
        await expect(body.getByRole('button', { name: /Execute Migration/i })).toBeInTheDocument();
    }
};

export const ActiveProgress: Story = {
    render: args => ({
        props: args,
        onNgInit(comp: MnyMigrationDialogComponent): void {
            comp.migrationService.step.set('migrating');
            comp.migrationService.isOpen.set(true);
            comp.migrationService.progressPercent.set(70);
            comp.migrationService.progressStage.set(MnyParseStage.ExtractingTransactions);
            comp.migrationService.currentTable.set('TRN');
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(
            body.getByText(/Migrating & Reconciling Microsoft Money Ledger.../i)
        ).toBeInTheDocument();
        await expect(
            body.getByText(/Merging & Reconciling Transactions & Splits.../i)
        ).toBeInTheDocument();
    }
};

export const AuditSummaryReport: Story = {
    render: args => ({
        props: args,
        onNgInit(comp: MnyMigrationDialogComponent): void {
            comp.migrationService.step.set('report');
            comp.migrationService.isOpen.set(true);
            comp.migrationService.auditReport.set(mockAuditReport);
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Migration Reconciled Successfully!/i)).toBeInTheDocument();
        await expect(body.getByText(/1420/i)).toBeInTheDocument(); // Transactions Ingested
        await expect(body.getByText(/Penny Discrepancy \(100% Balanced\)/i)).toBeInTheDocument();
        await expect(
            body.getByRole('button', { name: /Go to Accounts Overview/i })
        ).toBeInTheDocument();
    }
};
