import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it } from 'vitest';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { ExportDialogComponent } from './export-dialog.component';
import { Default, ErrorState, ExportingState } from './export-dialog.component.stories';

describe('ExportDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ExportDialogComponent>;

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

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExportDialogComponent],
            providers: [
                { provide: ImportExportService, useValue: mockImportExportService },
                MessageService
            ]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(ExportDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Export Data Backup');
        expect(document.body.textContent).toContain('Secure Encrypted Backup');
    });

    it('executes ExportingState story interaction test', async () => {
        fixture = TestBed.createComponent(ExportDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.isProcessing.set(true);
        fixture.componentInstance.statusMessage.set('Encrypting accounts and settings...');
        fixture.detectChanges();

        await ExportingState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain('Encrypting accounts and settings...');
    });

    it('executes ErrorState story interaction test', async () => {
        fixture = TestBed.createComponent(ExportDialogComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.componentInstance.isProcessing.set(false);
        fixture.componentInstance.statusMessage.set(
            'Export failed: Network error connecting to storage provider.'
        );
        fixture.detectChanges();

        await ErrorState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(document.body.textContent).toContain(
            'Export failed: Network error connecting to storage provider.'
        );
    });
});
