import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { MessageService } from 'primeng/api';
import { expect, userEvent, within } from 'storybook/test';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { ExportDialogComponent } from './export-dialog.component';

const mockImportExportService = {
    isExporting: signal<boolean>(false),
    isImporting: signal<boolean>(false),
    isScanning: signal<boolean>(false),
    exportToGDrive: async (_passphrase: string): Promise<{ folderName: string }> => ({
        folderName: '20260912_01'
    }),
    scanGDriveExports: async (): Promise<Array<never>> => [],
    verifyExportFolder: async (): Promise<{ metadata: unknown; report: unknown }> => ({
        metadata: {},
        report: {}
    }),
    importGDriveExportPackage: async (): Promise<void> => {}
};

const meta: Meta<ExportDialogComponent> = {
    title: 'ExportImport/ExportDialogComponent',
    component: ExportDialogComponent,
    decorators: [
        applicationConfig({
            providers: [
                { provide: ImportExportService, useValue: mockImportExportService },
                MessageService
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
type Story = StoryObj<ExportDialogComponent>;

export const Default: Story = {
    args: {
        visible: true
    },
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Secure Encrypted Backup/i)).toBeInTheDocument();

        const input =
            canvasElement.ownerDocument.querySelector<HTMLInputElement>(
                '#export-passphrase input'
            ) || (body.getByLabelText(/Encryption Key Passphrase/i) as HTMLInputElement);
        await expect(input).toBeInTheDocument();
        await userEvent.type(input, 'securepassword123');

        const exportBtn = body.getByRole('button', { name: /Export Data Backup/i });
        await expect(exportBtn).toBeInTheDocument();
        await expect(exportBtn).not.toBeDisabled();
    }
};

export const ExportingState: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportDialogComponent): void {
            comp.isProcessing.set(true);
            comp.statusMessage.set('Encrypting accounts and settings...');
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(body.getByText(/Encrypting accounts and settings\.\.\./i)).toBeInTheDocument();
    }
};

export const ErrorState: Story = {
    args: {
        visible: true
    },
    render: args => ({
        props: args,
        onNgInit(comp: ExportDialogComponent): void {
            comp.isProcessing.set(false);
            comp.statusMessage.set('Export failed: Network error connecting to storage provider.');
        }
    }),
    play: async ({ canvasElement }): Promise<void> => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(
            body.getByText(/Export failed: Network error connecting to storage provider\./i)
        ).toBeInTheDocument();
    }
};
