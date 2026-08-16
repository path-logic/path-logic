import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import { AccountType } from '../../../core/domain/types';
import type { IExportFolderSummary } from '../../../core/export-import';
import { ExportManagerDialogComponent } from './export-manager-dialog.component';

const mockFolders: Array<IExportFolderSummary> = [
    {
        folderId: 'f1',
        folderName: '20260808_01',
        createdAt: '2026-08-08T16:07:18.000Z',
        metadata: {
            exportId: 'exp-1',
            createdAt: '2026-08-08T16:07:18.000Z',
            appVersion: '4.2-alpha',
            coreVersion: '1.0.0',
            accounts: [
                {
                    id: 'acc-1',
                    name: 'Main Checking',
                    type: AccountType.Checking,
                    snakeCaseFilename: 'checking',
                    transactionCount: 142,
                    balanceCents: 543210,
                    sha256: 'abc'
                },
                {
                    id: 'acc-2',
                    name: 'High Yield Savings',
                    type: AccountType.Savings,
                    snakeCaseFilename: 'savings',
                    transactionCount: 28,
                    balanceCents: 1200000,
                    sha256: 'def'
                }
            ],
            ancillaryFile: {
                filename: 'ancillary.json.enc',
                sha256: 'abc',
                algorithm: 'AES-GCM-256'
            },
            overallChecksum: 'checksum1'
        }
    },
    {
        folderId: 'f2',
        folderName: '20260808_02',
        createdAt: '2026-08-08T12:00:00.000Z',
        metadata: {
            exportId: 'exp-2',
            createdAt: '2026-08-08T12:00:00.000Z',
            appVersion: '4.2-alpha',
            coreVersion: '1.0.0',
            accounts: [
                {
                    id: 'acc-1',
                    name: 'Main Checking',
                    type: AccountType.Checking,
                    snakeCaseFilename: 'checking',
                    transactionCount: 140,
                    balanceCents: 530000,
                    sha256: 'abc'
                }
            ],
            ancillaryFile: {
                filename: 'ancillary.json.enc',
                sha256: 'abc',
                algorithm: 'AES-GCM-256'
            },
            overallChecksum: 'checksum2'
        }
    }
];

const meta: Meta<ExportManagerDialogComponent> = {
    title: 'ExportImport/ExportManagerDialogComponent',
    component: ExportManagerDialogComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom(BrowserAnimationsModule)]
        }),
        moduleMetadata({
            imports: [ExportManagerDialogComponent]
        })
    ],
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<ExportManagerDialogComponent>;

export const Default: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportManagerDialogComponent) {
            comp.folders.set(mockFolders);
        }
    }),
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const title = await body.findByText(/Manage Export Backups/i);
        await expect(title).toBeInTheDocument();
    }
};

export const EmptyState: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportManagerDialogComponent) {
            comp.folders.set([]);
        }
    })
};

export const Mobile: Story = {
    args: {
        visible: true
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1'
        }
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportManagerDialogComponent) {
            comp.folders.set(mockFolders);
        }
    })
};

export const Tablet: Story = {
    args: {
        visible: true
    },
    parameters: {
        viewport: {
            defaultViewport: 'tablet'
        }
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportManagerDialogComponent) {
            comp.folders.set(mockFolders);
        }
    })
};

export const DarkMode: Story = {
    args: {
        visible: true
    },
    parameters: {
        themes: {
            current: 'dark'
        }
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportManagerDialogComponent) {
            comp.folders.set(mockFolders);
        }
    })
};
