import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '../../../core/domain/types';
import type { IExportFolderSummary } from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { ExportManagerDialogComponent } from './export-manager-dialog.component';
import {
    DarkMode,
    Default,
    EmptyState,
    Mobile,
    Tablet
} from './export-manager-dialog.component.stories';

describe('ExportManagerDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ExportManagerDialogComponent>;

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
        }
    ];

    const mockImportExportService = {
        isScanning: signal<boolean>(false),
        isExporting: signal<boolean>(false),
        isImporting: signal<boolean>(false),
        scanGDriveExports: vi.fn().mockResolvedValue(mockFolders),
        deleteExportFolder: vi.fn().mockResolvedValue(undefined),
        cleanupExportsByPolicy: vi.fn().mockResolvedValue(new Array<string>()),
        consolidateSameDayExports: vi.fn().mockResolvedValue({
            targetFolderName: '20260808_consolidated',
            sourceFoldersCombined: new Array<string>('f1')
        })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExportManagerDialogComponent],
            providers: [{ provide: ImportExportService, useValue: mockImportExportService }]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(ExportManagerDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.folders.set(mockFolders);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Manage Export Backups');
    });

    it('executes EmptyState story interaction test', async () => {
        fixture = TestBed.createComponent(ExportManagerDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.folders.set(new Array<IExportFolderSummary>());
        fixture.detectChanges();

        await EmptyState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('No export packages found');
    });

    it('executes Mobile story interaction test', async () => {
        fixture = TestBed.createComponent(ExportManagerDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.folders.set(mockFolders);
        fixture.detectChanges();

        await Mobile.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('20260808_01');
    }, 15000);

    it('executes Tablet story interaction test', async () => {
        fixture = TestBed.createComponent(ExportManagerDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.folders.set(mockFolders);
        fixture.detectChanges();

        await Tablet.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('20260808_01');
    }, 15000);

    it('executes DarkMode story interaction test', async () => {
        fixture = TestBed.createComponent(ExportManagerDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.folders.set(mockFolders);
        fixture.detectChanges();

        await DarkMode.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Manage Export Backups');
    }, 15000);
});
