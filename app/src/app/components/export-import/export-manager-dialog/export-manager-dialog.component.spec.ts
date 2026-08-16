import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountType } from '../../../core/domain/types';
import type { IConsolidatedOutputPackage, IExportFolderSummary } from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { ExportManagerDialogComponent } from './export-manager-dialog.component';

describe('ExportManagerDialogComponent', () => {
    let component: ExportManagerDialogComponent;
    let fixture: ComponentFixture<ExportManagerDialogComponent>;

    const mockScanGDriveExports = vi.fn();
    const mockDeleteExportFolder = vi.fn();
    const mockCleanupExportsByPolicy = vi.fn();
    const mockConsolidateSameDayExports = vi.fn();

    const mockFolders: Array<IExportFolderSummary> = [
        {
            folderId: 'f-1',
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
                        name: 'Checking',
                        type: AccountType.Checking,
                        snakeCaseFilename: 'checking',
                        transactionCount: 10,
                        balanceCents: 100000,
                        sha256: 'abc'
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
            folderId: 'f-2',
            folderName: '20260808_02',
            createdAt: '2026-08-08T16:01:42.000Z',
            metadata: {
                exportId: 'exp-2',
                createdAt: '2026-08-08T16:01:42.000Z',
                appVersion: '4.2-alpha',
                coreVersion: '1.0.0',
                accounts: [
                    {
                        id: 'acc-1',
                        name: 'Checking',
                        type: AccountType.Checking,
                        snakeCaseFilename: 'checking',
                        transactionCount: 10,
                        balanceCents: 100000,
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

    beforeEach(async () => {
        mockScanGDriveExports.mockResolvedValue(mockFolders);
        mockDeleteExportFolder.mockResolvedValue(undefined);
        mockCleanupExportsByPolicy.mockResolvedValue(['f-2']);
        mockConsolidateSameDayExports.mockResolvedValue({
            targetFolderName: '20260808_consolidated',
            sourceFoldersCombined: ['f-1', 'f-2']
        } as IConsolidatedOutputPackage);

        await TestBed.configureTestingModule({
            imports: [ExportManagerDialogComponent],
            providers: [
                provideNoopAnimations(),
                {
                    provide: ImportExportService,
                    useValue: {
                        isScanning: signal<boolean>(false),
                        scanGDriveExports: mockScanGDriveExports,
                        deleteExportFolder: mockDeleteExportFolder,
                        cleanupExportsByPolicy: mockCleanupExportsByPolicy,
                        consolidateSameDayExports: mockConsolidateSameDayExports
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ExportManagerDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should load export packages and update folders signal', async () => {
        await component.loadPackages();
        expect(mockScanGDriveExports).toHaveBeenCalled();
        expect(component.folders().length).toBe(2);
        expect(component.folders()[0]?.folderName).toBe('20260808_01');
    });

    it('should delete a package and remove it from folders signal', async () => {
        component.folders.set(mockFolders);
        await component.deletePackage('f-1');

        expect(mockDeleteExportFolder).toHaveBeenCalledWith('f-1');
        expect(component.folders().length).toBe(1);
        expect(component.folders()[0]?.folderId).toBe('f-2');
    });

    it('should run retention cleanup and update packages', async () => {
        component.folders.set(mockFolders);
        component.maxAgeDays = 30;
        component.keepLatestCount = 5;

        await component.runRetentionCleanup();

        expect(mockCleanupExportsByPolicy).toHaveBeenCalledWith({
            maxAgeDays: 30,
            keepLatestCount: 5
        });
        expect(mockScanGDriveExports).toHaveBeenCalled();
    });

    it('should consolidate same-day exports', async () => {
        component.folders.set(mockFolders);
        await component.consolidateSameDay('20260808');

        expect(mockConsolidateSameDayExports).toHaveBeenCalledWith('20260808');
        expect(mockScanGDriveExports).toHaveBeenCalled();
    });

    it('should close dialog when close() is invoked', () => {
        component.visible.set(true);
        component.close();
        expect(component.visible()).toBe(false);
    });
});
