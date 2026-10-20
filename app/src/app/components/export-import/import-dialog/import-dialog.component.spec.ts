import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AccountType } from '@core';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ICorruptedAccountReport,
    ICorruptionReport,
    IExportFolderSummary,
    IExportMetadata,
    IRecoveryAction
} from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ImportDialogComponent } from './import-dialog.component';

describe('ImportDialogComponent', () => {
    let component: ImportDialogComponent;
    let fixture: ComponentFixture<ImportDialogComponent>;
    let messageService: MessageService;

    let mockImportExportService: {
        isScanning: ReturnType<typeof signal<boolean>>;
        isImporting: ReturnType<typeof signal<boolean>>;
        isExporting: ReturnType<typeof signal<boolean>>;
        scanGDriveExports: ReturnType<typeof vi.fn>;
        verifyExportFolder: ReturnType<typeof vi.fn>;
        importGDriveExportPackage: ReturnType<typeof vi.fn>;
    };

    let mockLedgerStore: {
        accounts: ReturnType<typeof signal<Array<unknown>>>;
        transactions: ReturnType<typeof signal<Array<unknown>>>;
        categories: ReturnType<typeof signal<Array<unknown>>>;
        payees: ReturnType<typeof signal<Array<unknown>>>;
    };

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
                },
                {
                    id: 'acc-2',
                    name: 'Savings Account',
                    type: AccountType.Savings,
                    snakeCaseFilename: 'savings_account.qif.enc',
                    transactionCount: 10,
                    balanceCents: 500000,
                    sha256: 'def'
                }
            ],
            ancillaryFile: {
                filename: 'ancillary_settings.enc',
                sha256: 'ghi',
                algorithm: 'AES-GCM-256'
            },
            overallChecksum: 'xyz'
        }
    };

    beforeEach(async () => {
        mockImportExportService = {
            isScanning: signal<boolean>(false),
            isImporting: signal<boolean>(false),
            isExporting: signal<boolean>(false),
            scanGDriveExports: vi.fn().mockResolvedValue([mockFolder]),
            verifyExportFolder: vi.fn().mockResolvedValue({
                metadata: mockFolder.metadata,
                report: {
                    hasCorruption: false,
                    invalidChecksumFiles: new Array<string>(),
                    corruptedAccounts: new Array<ICorruptedAccountReport>()
                }
            }),
            importGDriveExportPackage: vi.fn().mockResolvedValue(undefined)
        };

        mockLedgerStore = {
            accounts: signal(new Array<unknown>()),
            transactions: signal(new Array<unknown>()),
            categories: signal(new Array<unknown>()),
            payees: signal(new Array<unknown>())
        };

        await TestBed.configureTestingModule({
            imports: [ImportDialogComponent],
            providers: [
                { provide: ImportExportService, useValue: mockImportExportService },
                { provide: LedgerStore, useValue: mockLedgerStore },
                MessageService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ImportDialogComponent);
        component = fixture.componentInstance;
        messageService = fixture.debugElement.injector.get(MessageService);
        vi.spyOn(messageService, 'add');
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
        expect(component.step()).toBe('scan');
    });

    describe('openAndScan', () => {
        it('should scan storage and populate available folders', async () => {
            await component.openAndScan();

            expect(mockImportExportService.scanGDriveExports).toHaveBeenCalled();
            expect(component.availableFolders()).toEqual([mockFolder]);
            expect(component.statusMessage()).toBe('Found 1 export package(s)');
        });

        it('should set appropriate message when no folders are found', async () => {
            mockImportExportService.scanGDriveExports.mockResolvedValueOnce([]);

            await component.openAndScan();

            expect(component.availableFolders()).toEqual([]);
            expect(component.statusMessage()).toBe('No export packages found in backup storage.');
        });
    });

    describe('selectFolder and parsing', () => {
        it('should verify folder and advance to inspect step with accounts preselected', async () => {
            await component.selectFolder(mockFolder);

            expect(component.selectedFolder()).toEqual(mockFolder);
            expect(mockImportExportService.verifyExportFolder).toHaveBeenCalledWith(
                mockFolder.folderId,
                ''
            );
            expect(component.selectedMetadata()).toEqual(mockFolder.metadata);
            expect(component.options.selectedAccountIdsToImport).toEqual(['acc-1', 'acc-2']);
            expect(component.step()).toBe('inspect');
        });

        it('should transition to recovery step when corruption is detected', async () => {
            const corruptionReport: ICorruptionReport = {
                hasCorruption: true,
                invalidChecksumFiles: ['checking_account.qif.enc'],
                corruptedAccounts: [
                    {
                        accountId: 'acc-1',
                        accountName: 'Checking Account',
                        filename: 'checking_account.qif.enc',
                        expectedBalanceCents: 154000,
                        validTransactionsSumCents: 150000,
                        discrepancyCents: 4000,
                        corruptedTransactions: [
                            {
                                lineNumber: 12,
                                rawLine: '^D2026-08-01^Tbad^',
                                reason: 'Invalid transaction date/amount syntax'
                            }
                        ]
                    }
                ]
            };

            mockImportExportService.verifyExportFolder.mockResolvedValueOnce({
                metadata: mockFolder.metadata,
                report: corruptionReport
            });

            await component.selectFolder(mockFolder);

            expect(component.corruptionReport()).toEqual(corruptionReport);
            expect(component.step()).toBe('recovery');
        });

        it('should fallback to folder.metadata when verifyExportFolder throws but metadata exists', async () => {
            mockImportExportService.verifyExportFolder.mockRejectedValueOnce(
                new Error('Checksum verification failed')
            );

            await component.selectFolder(mockFolder);

            expect(component.selectedMetadata()).toEqual(mockFolder.metadata);
            expect(component.options.selectedAccountIdsToImport).toEqual(['acc-1', 'acc-2']);
            expect(component.step()).toBe('inspect');
        });

        it('should add error toast when verification fails and folder has no metadata', async () => {
            mockImportExportService.verifyExportFolder.mockRejectedValueOnce(
                new Error('Network error connecting to drive')
            );
            const folderWithoutMetadata: IExportFolderSummary = {
                folderId: 'folder-no-meta',
                folderName: '20260808_corrupt',
                createdAt: '2026-08-08T09:00:00.000Z'
            };

            await component.selectFolder(folderWithoutMetadata);

            expect(messageService.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Folder Inspection Failed',
                    detail: expect.stringContaining('Storage Provider Error')
                })
            );
        });
    });

    describe('selection controls', () => {
        it('should toggle all settings flags with toggleSelectAllSettings', () => {
            component.toggleSelectAllSettings(false);
            expect(component.settingsSelectAll).toBe(false);
            expect(component.options.settings.categories).toBe(false);
            expect(component.options.settings.payees).toBe(false);
            expect(component.options.settings.recurringSchedules).toBe(false);
            expect(component.options.settings.featureFlags).toBe(false);
            expect(component.options.settings.userSettings).toBe(false);

            component.toggleSelectAllSettings(true);
            expect(component.settingsSelectAll).toBe(true);
            expect(component.options.settings.categories).toBe(true);
            expect(component.options.settings.payees).toBe(true);
            expect(component.options.settings.recurringSchedules).toBe(true);
            expect(component.options.settings.featureFlags).toBe(true);
            expect(component.options.settings.userSettings).toBe(true);
        });

        it('should toggle account selection', () => {
            component.options.selectedAccountIdsToImport = ['acc-1'];

            component.toggleAccountSelection('acc-2', true);
            expect(component.options.selectedAccountIdsToImport).toContain('acc-2');

            // Re-adding same should not duplicate
            component.toggleAccountSelection('acc-2', true);
            expect(
                component.options.selectedAccountIdsToImport.filter(id => id === 'acc-2').length
            ).toBe(1);

            component.toggleAccountSelection('acc-1', false);
            expect(component.options.selectedAccountIdsToImport).not.toContain('acc-1');
        });

        it('should update recoveryActions and transition to inspect on onRecoveryResolved', () => {
            const actions: Array<IRecoveryAction> = [
                {
                    accountId: 'acc-1',
                    dropCorrupted: true,
                    reconciliationAdjustmentCents: 4000,
                    reconciliationMemo: 'Recovery adjustment'
                }
            ];

            component.onRecoveryResolved(actions);

            expect(component.recoveryActions()).toEqual(actions);
            expect(component.step()).toBe('inspect');
        });
    });

    describe('executeImport', () => {
        beforeEach(() => {
            component.selectedFolder.set(mockFolder);
            component.selectedMetadata.set(mockFolder.metadata as IExportMetadata);
            component.passphrase.set('secret-passphrase');
            component.options.selectedAccountIdsToImport = ['acc-1'];
        });

        it('should successfully execute import, emit importCompleted, and close', async () => {
            const emitSpy = vi.spyOn(component.importCompleted, 'emit');
            const closeSpy = vi.spyOn(component, 'close');

            await component.executeImport();

            expect(component.step()).toBe('importing');
            expect(mockImportExportService.importGDriveExportPackage).toHaveBeenCalledWith(
                mockFolder.folderId,
                component.options,
                component.recoveryActions(),
                'secret-passphrase'
            );
            expect(messageService.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'success',
                    summary: 'Data Backup Restored'
                })
            );
            expect(emitSpy).toHaveBeenCalled();
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should do nothing if selectedFolder is null', async () => {
            component.selectedFolder.set(null);

            await component.executeImport();

            expect(mockImportExportService.importGDriveExportPackage).not.toHaveBeenCalled();
        });

        it('should close dialog and show error toast when import fails', async () => {
            mockImportExportService.importGDriveExportPackage.mockRejectedValueOnce(
                new Error('Decryption Failed: OperationError')
            );
            const closeSpy = vi.spyOn(component, 'close');

            await component.executeImport();

            expect(closeSpy).toHaveBeenCalled();
            expect(messageService.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Import Failed',
                    detail: expect.stringContaining('Decryption Failed')
                })
            );
        });
    });

    describe('dialog cancel and close', () => {
        it('should reset statusMessage, passphrase, and set visible to false on close()', () => {
            component.statusMessage.set('Something');
            component.passphrase.set('mypass');
            component.visible.set(true);

            component.close();

            expect(component.statusMessage()).toBe('');
            expect(component.passphrase()).toBe('');
            expect(component.visible()).toBe(false);
        });

        it('should invoke close() when Cancel button is clicked in the footer', () => {
            const closeSpy = vi.spyOn(component, 'close');
            component.step.set('scan');
            fixture.detectChanges();

            const cancelBtn = document.body.querySelector(
                'button[aria-label="Cancel Import"]'
            ) as HTMLButtonElement;
            expect(cancelBtn).toBeTruthy();
            cancelBtn.click();

            expect(closeSpy).toHaveBeenCalled();
        });
    });
});
