import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AccountType } from '@core';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
    ICorruptedAccountReport,
    ICorruptionReport,
    IExportFolderSummary
} from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ImportDialogComponent } from './import-dialog.component';
import { ImportingStep, InspectionStep, ScanningStep } from './import-dialog.component.stories';

describe('ImportDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ImportDialogComponent>;

    const mockFolder: IExportFolderSummary = {
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
    };

    const mockCorruptionReport: ICorruptionReport = {
        hasCorruption: false,
        invalidChecksumFiles: new Array<string>(),
        corruptedAccounts: new Array<ICorruptedAccountReport>()
    };

    const mockImportExportService = {
        isScanning: signal<boolean>(false),
        isImporting: signal<boolean>(false),
        isExporting: signal<boolean>(false),
        scanGDriveExports: async (): Promise<Array<IExportFolderSummary>> => [mockFolder],
        verifyExportFolder: async () => ({
            metadata: mockFolder.metadata!,
            report: mockCorruptionReport
        }),
        importGDriveExportPackage: async (): Promise<void> => {}
    };

    const mockLedgerStore = {
        accounts: signal(new Array<unknown>()),
        transactions: signal(new Array<unknown>()),
        categories: signal(new Array<unknown>()),
        payees: signal(new Array<unknown>())
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ImportDialogComponent],
            providers: [
                { provide: ImportExportService, useValue: mockImportExportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                MessageService
            ]
        }).compileComponents();
    });

    it('executes ScanningStep story interaction test', async () => {
        fixture = TestBed.createComponent(ImportDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();

        fixture.componentInstance.step.set('scan');
        fixture.componentInstance.availableFolders.set([mockFolder]);
        fixture.detectChanges();

        await ScanningStep.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Available Export Packages');
        expect(document.body.textContent).toContain('20260808_01');
    });

    it('executes InspectionStep story interaction test', async () => {
        fixture = TestBed.createComponent(ImportDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();

        fixture.componentInstance.step.set('inspect');
        fixture.componentInstance.selectedFolder.set(mockFolder);
        fixture.componentInstance.selectedMetadata.set(mockFolder.metadata!);
        fixture.componentInstance.options.selectedAccountIdsToImport = ['acc-1'];
        fixture.detectChanges();

        await InspectionStep.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Selected Package');
        expect(document.body.textContent).toContain('Binary Integrity Passed');
    });

    it('executes ImportingStep story interaction test', async () => {
        fixture = TestBed.createComponent(ImportDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();

        fixture.componentInstance.step.set('importing');
        fixture.componentInstance.statusMessage.set('Importing selected ledgers and settings...');
        fixture.detectChanges();

        await ImportingStep.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Importing selected ledgers and settings...');
    });
});
