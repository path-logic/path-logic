import { signal } from '@angular/core';
import { AccountType } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import type { ICorruptionReport, IExportFolderSummary } from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ImportDialogComponent } from './import-dialog.component';

const mockFolders: Array<IExportFolderSummary> = [
    {
        folderId: 'folder-1',
        folderName: '20260808_01',
        createdAt: '2026-08-08T09:00:00.000Z',
        metadata: {
            exportId: 'exp-1',
            createdAt: '2026-08-08T09:00:00.000Z',
            appVersion: '0.1.0',
            coreVersion: '0.1.0',
            accounts: [
                {
                    id: 'acc-1',
                    name: 'Checking Account',
                    type: AccountType.Checking,
                    snakeCaseFilename: 'checking_account.qif.enc',
                    transactionCount: 42,
                    balanceCents: 154000,
                    sha256: 'abc'
                }
            ],
            ancillaryFile: {
                filename: 'ancillary_settings.enc',
                sha256: 'def',
                algorithm: 'AES-GCM-256'
            },
            overallChecksum: 'xyz'
        }
    }
];

const mockCorruptionReport: ICorruptionReport = {
    hasCorruption: false,
    invalidChecksumFiles: new Array<string>(),
    corruptedAccounts: new Array<any>()
};

const mockImportExportService = {
    isScanning: signal(false),
    isImporting: signal(false),
    isExporting: signal(false),
    scanGDriveExports: async (): Promise<Array<IExportFolderSummary>> => mockFolders,
    verifyExportFolder: async () => ({
        metadata: mockFolders[0]!.metadata!,
        report: mockCorruptionReport
    }),
    importGDriveExportPackage: async (): Promise<void> => {}
};

const mockLedgerStore = {
    accounts: signal([]),
    transactions: signal([]),
    categories: signal([]),
    payees: signal([])
};

const meta: Meta<ImportDialogComponent> = {
    title: 'ExportImport/ImportDialogComponent',
    component: ImportDialogComponent,
    decorators: [
        applicationConfig({
            providers: [
                { provide: ImportExportService, useValue: mockImportExportService },
                { provide: LedgerStore, useValue: mockLedgerStore }
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
type Story = StoryObj<ImportDialogComponent>;

export const ScanningStep: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ImportDialogComponent): void {
            comp.step.set('scan');
            comp.availableFolders.set(mockFolders);
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Restore Data Backup/i)).toBeInTheDocument();
        await expect(body.getByText(/Available Export Packages/i)).toBeInTheDocument();
        await expect(body.getByText(/20260808_01/i)).toBeInTheDocument();
        await expect(body.getByRole('button', { name: /Inspect & Import/i })).toBeInTheDocument();
    }
};

export const InspectionStep: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ImportDialogComponent): void {
            comp.step.set('inspect');
            comp.selectedFolder.set(mockFolders[0]!);
            comp.selectedMetadata.set(mockFolders[0]!.metadata!);
            comp.options.selectedAccountIdsToImport = ['acc-1'];
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Selected Package/i)).toBeInTheDocument();
        await expect(body.getByText(/Binary Integrity Passed/i)).toBeInTheDocument();
        await expect(body.getByText(/Ancillary Settings Import/i)).toBeInTheDocument();

        const passphraseInput =
            (canvasElement.ownerDocument.getElementById('import-passphrase') as HTMLInputElement) ||
            body
                .getAllByPlaceholderText(/Enter the encryption key/i)
                .find(el => el.tagName === 'INPUT')!;
        await expect(passphraseInput).toBeInTheDocument();
        await userEvent.type(passphraseInput, 'correct-horse-battery');

        const executeBtn = body.getByRole('button', { name: /Execute Import/i });
        await expect(executeBtn).toBeInTheDocument();
        await expect(executeBtn).not.toBeDisabled();
    }
};

export const ImportingStep: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ImportDialogComponent): void {
            comp.step.set('importing');
            comp.statusMessage.set('Importing selected ledgers and settings...');
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(
            body.getByText(/Importing selected ledgers and settings.../i)
        ).toBeInTheDocument();
    }
};
