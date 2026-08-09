import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AccountType } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { ImportDialogComponent } from './import-dialog.component';

const meta: Meta<ImportDialogComponent> = {
    title: 'ExportImport/ImportDialogComponent',
    component: ImportDialogComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom(BrowserAnimationsModule)]
        }),
        moduleMetadata({
            imports: [ImportDialogComponent]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
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
        onNgInit(comp: ImportDialogComponent) {
            comp.step.set('scan');
            comp.availableFolders.set([
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
            ]);
        }
    })
};

export const InspectionStep: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ImportDialogComponent) {
            comp.step.set('inspect');
            comp.selectedFolder.set({
                folderId: 'folder-1',
                folderName: '20260808_01',
                createdAt: '2026-08-08T09:00:00.000Z'
            });
            comp.selectedMetadata.set({
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
            });
        }
    })
};

export const ImportingStep: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ImportDialogComponent) {
            comp.step.set('importing');
            comp.statusMessage.set('Importing selected ledgers and settings...');
        }
    })
};
