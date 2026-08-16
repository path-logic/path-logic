import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
import { AccountType, type Cents } from '../../../core/domain/types';
import type { IExportFolderSummary, IRetentionPolicy } from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';

@Component({
    selector: 'app-export-manager-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputNumberModule,
        ProgressBarModule
    ],
    templateUrl: './export-manager-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportManagerDialogComponent {
    /** Two-way Angular 21 Signal Model binding for dialog visibility */
    readonly visible = model<boolean>(false);

    readonly importExportService: ImportExportService = inject(ImportExportService);

    readonly folders = signal<Array<IExportFolderSummary>>([]);
    readonly isProcessing = signal<boolean>(false);
    readonly statusMessage = signal<string>('');

    // Retention policy settings
    maxAgeDays: number = 30;
    keepLatestCount: number = 5;

    async loadPackages(): Promise<void> {
        this.statusMessage.set('Loading GDrive export packages...');
        try {
            const list = await this.importExportService.scanGDriveExports();
            if (
                list.length === 0 &&
                typeof localStorage !== 'undefined' &&
                localStorage.getItem('pl.dev.mode') === 'true'
            ) {
                this.folders.set(this.getDemoPackages());
                this.statusMessage.set('Loaded demo backup packages for dev testing.');
            } else {
                this.folders.set(list);
                this.statusMessage.set(
                    list.length
                        ? `Found ${list.length} export package(s)`
                        : 'No export packages found.'
                );
            }
        } catch {
            if (
                typeof localStorage !== 'undefined' &&
                localStorage.getItem('pl.dev.mode') === 'true'
            ) {
                this.folders.set(this.getDemoPackages());
                this.statusMessage.set('Loaded demo backup packages for dev testing.');
            } else {
                this.statusMessage.set('Failed to load packages: Google Drive not authenticated.');
            }
        }
    }

    private getDemoPackages(): Array<IExportFolderSummary> {
        return [
            {
                folderId: 'pkg-20260808-01',
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
                            snakeCaseFilename: 'main_checking',
                            transactionCount: 142,
                            balanceCents: 543210 as Cents,
                            sha256: 'a1b2c3d4'
                        }
                    ],
                    ancillaryFile: {
                        filename: 'ancillary.json.enc',
                        sha256: 'e5f6a7b8',
                        algorithm: 'AES-GCM-256'
                    },
                    overallChecksum: 'chk123456'
                }
            },
            {
                folderId: 'pkg-20260808-02',
                folderName: '20260808_02',
                createdAt: '2026-08-08T12:01:42.000Z',
                metadata: {
                    exportId: 'exp-2',
                    createdAt: '2026-08-08T12:01:42.000Z',
                    appVersion: '4.2-alpha',
                    coreVersion: '1.0.0',
                    accounts: [
                        {
                            id: 'acc-1',
                            name: 'Main Checking',
                            type: AccountType.Checking,
                            snakeCaseFilename: 'main_checking',
                            transactionCount: 140,
                            balanceCents: 530000 as Cents,
                            sha256: 'a1b2c3d4'
                        },
                        {
                            id: 'acc-2',
                            name: 'High Yield Savings',
                            type: AccountType.Savings,
                            snakeCaseFilename: 'high_yield_savings',
                            transactionCount: 28,
                            balanceCents: 1200000 as Cents,
                            sha256: 'c3d4e5f6'
                        }
                    ],
                    ancillaryFile: {
                        filename: 'ancillary.json.enc',
                        sha256: 'e5f6a7b8',
                        algorithm: 'AES-GCM-256'
                    },
                    overallChecksum: 'chk789012'
                }
            }
        ];
    }

    async deletePackage(folderId: string): Promise<void> {
        this.isProcessing.set(true);
        this.statusMessage.set('Deleting export package...');

        try {
            await this.importExportService.deleteExportFolder(folderId);
            // Immediately update signal state for reactive list removal
            this.folders.update(current => current.filter(f => f.folderId !== folderId));
            this.statusMessage.set('Package deleted successfully.');
        } catch (err: unknown) {
            this.statusMessage.set(
                `Delete failed: ${err instanceof Error ? err.message : String(err)}`
            );
        } finally {
            this.isProcessing.set(false);
        }
    }

    async runRetentionCleanup(): Promise<void> {
        this.isProcessing.set(true);
        this.statusMessage.set('Applying retention policy cleanup...');

        try {
            const policy: IRetentionPolicy = {
                maxAgeDays: this.maxAgeDays,
                keepLatestCount: this.keepLatestCount
            };

            const deletedIds = await this.importExportService.cleanupExportsByPolicy(policy);
            // Remove deleted IDs immediately from signal
            this.folders.update(current => current.filter(f => !deletedIds.includes(f.folderId)));
            this.statusMessage.set(`Cleaned up ${deletedIds.length} export package(s).`);
            await this.loadPackages();
        } catch (err: unknown) {
            this.statusMessage.set(
                `Retention cleanup failed: ${err instanceof Error ? err.message : String(err)}`
            );
        } finally {
            this.isProcessing.set(false);
        }
    }

    async consolidateSameDay(dateStr: string): Promise<void> {
        this.isProcessing.set(true);
        this.statusMessage.set(`Consolidating same-day exports for ${dateStr}...`);

        try {
            const res = await this.importExportService.consolidateSameDayExports(dateStr);
            this.statusMessage.set(
                `Successfully consolidated ${res.sourceFoldersCombined.length} exports into package ${res.targetFolderName}`
            );
            await this.loadPackages();
        } catch (err: unknown) {
            this.statusMessage.set(
                `Consolidation failed: ${err instanceof Error ? err.message : String(err)}`
            );
        } finally {
            this.isProcessing.set(false);
        }
    }

    close(): void {
        this.visible.set(false);
    }
}
