import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
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
            this.folders.set(list);
            this.statusMessage.set(
                list.length ? `Found ${list.length} export package(s)` : 'No export packages found.'
            );
        } catch (err: unknown) {
            this.statusMessage.set(
                `Failed to load packages: ${err instanceof Error ? err.message : String(err)}`
            );
        }
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
