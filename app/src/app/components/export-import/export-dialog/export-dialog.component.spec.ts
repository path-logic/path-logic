import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
    let component: ExportDialogComponent;
    let fixture: ComponentFixture<ExportDialogComponent>;
    let messageService: MessageService;

    let mockImportExportService: {
        isExporting: ReturnType<typeof signal<boolean>>;
        isImporting: ReturnType<typeof signal<boolean>>;
        isScanning: ReturnType<typeof signal<boolean>>;
        exportToGDrive: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockImportExportService = {
            isExporting: signal<boolean>(false),
            isImporting: signal<boolean>(false),
            isScanning: signal<boolean>(false),
            exportToGDrive: vi.fn().mockResolvedValue({ folderName: '20260912_01' })
        };

        await TestBed.configureTestingModule({
            imports: [ExportDialogComponent],
            providers: [
                { provide: ImportExportService, useValue: mockImportExportService },
                MessageService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ExportDialogComponent);
        component = fixture.componentInstance;
        messageService = fixture.debugElement.injector.get(MessageService);
        vi.spyOn(messageService, 'add');
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
        expect(component.visible()).toBe(true);
        expect(component.passphrase()).toBe('');
        expect(component.isProcessing()).toBe(false);
        expect(component.statusMessage()).toBe('');
    });

    describe('isPassphraseValid', () => {
        it('should return false for empty or whitespace passphrase', () => {
            component.passphrase.set('');
            expect(component.isPassphraseValid()).toBe(false);

            component.passphrase.set('       ');
            expect(component.isPassphraseValid()).toBe(false);
        });

        it('should return false for passphrases shorter than 8 characters', () => {
            component.passphrase.set('1234567');
            expect(component.isPassphraseValid()).toBe(false);
        });

        it('should return true for passphrases with 8 or more characters', () => {
            component.passphrase.set('12345678');
            expect(component.isPassphraseValid()).toBe(true);

            component.passphrase.set('supersecretpassphrase');
            expect(component.isPassphraseValid()).toBe(true);
        });
    });

    describe('startExport', () => {
        it('should do nothing if passphrase is invalid', async () => {
            component.passphrase.set('short');

            await component.startExport();

            expect(mockImportExportService.exportToGDrive).not.toHaveBeenCalled();
            expect(component.isProcessing()).toBe(false);
        });

        it('should perform export, notify user, emit exportCompleted, and close on success', async () => {
            const emitSpy = vi.spyOn(component.exportCompleted, 'emit');
            const closeSpy = vi.spyOn(component, 'close');
            component.passphrase.set('my-secure-password-123');

            await component.startExport();

            expect(mockImportExportService.exportToGDrive).toHaveBeenCalledWith(
                'my-secure-password-123'
            );
            expect(component.createdFolderName()).toBe('20260912_01');
            expect(messageService.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'success',
                    summary: 'Data Backup Created'
                })
            );
            expect(emitSpy).toHaveBeenCalledWith('20260912_01');
            expect(closeSpy).toHaveBeenCalled();
            expect(component.isProcessing()).toBe(false);
        });

        it('should handle export errors, set statusMessage, and keep dialog open', async () => {
            mockImportExportService.exportToGDrive.mockRejectedValueOnce(
                new Error('Cloud storage quota exceeded')
            );
            const closeSpy = vi.spyOn(component, 'close');
            component.passphrase.set('my-secure-password-123');

            await component.startExport();

            expect(component.statusMessage()).toBe('Export failed: Cloud storage quota exceeded');
            expect(component.isProcessing()).toBe(false);
            expect(closeSpy).not.toHaveBeenCalled();
            expect(component.visible()).toBe(true);
        });

        it('should handle non-Error throwables gracefully', async () => {
            mockImportExportService.exportToGDrive.mockRejectedValueOnce(
                'Unexpected network issue'
            );
            component.passphrase.set('my-secure-password-123');

            await component.startExport();

            expect(component.statusMessage()).toBe('Export failed: Unexpected network issue');
            expect(component.isProcessing()).toBe(false);
        });
    });

    describe('close', () => {
        it('should clear statusMessage, passphrase, and set visible to false', () => {
            component.statusMessage.set('Some message');
            component.passphrase.set('my-passphrase');
            component.visible.set(true);

            component.close();

            expect(component.statusMessage()).toBe('');
            expect(component.passphrase()).toBe('');
            expect(component.visible()).toBe(false);
        });

        it('should trigger close when Cancel button is clicked', () => {
            const closeSpy = vi.spyOn(component, 'close');
            const cancelBtn = document.body.querySelector(
                'button[aria-label="Cancel Export"]'
            ) as HTMLButtonElement;

            expect(cancelBtn).toBeTruthy();
            cancelBtn.click();

            expect(closeSpy).toHaveBeenCalled();
        });
    });

    describe('template state rendering', () => {
        it('should show warning message when passphrase is between 1 and 7 characters', () => {
            component.passphrase.set('short');
            fixture.detectChanges();

            expect(document.body.textContent).toContain(
                'Key must be at least 8 characters long (currently 5 characters).'
            );
        });

        it('should show progress bar message when isProcessing is true', () => {
            component.isProcessing.set(true);
            component.statusMessage.set('Encrypting accounts and settings...');
            fixture.detectChanges();

            expect(document.body.textContent).toContain('Encrypting accounts and settings...');
        });

        it('should disable submit button when passphrase is invalid', () => {
            component.passphrase.set('short');
            fixture.detectChanges();

            const submitBtn = document.body.querySelector(
                'button[aria-label="Export Data Backup"]'
            ) as HTMLButtonElement;
            expect(submitBtn.disabled).toBe(true);
        });

        it('should enable submit button when passphrase is valid and not processing', () => {
            component.passphrase.set('valid-secure-pass');
            fixture.detectChanges();

            const submitBtn = document.body.querySelector(
                'button[aria-label="Export Data Backup"]'
            ) as HTMLButtonElement;
            expect(submitBtn.disabled).toBe(false);
        });
    });
});
