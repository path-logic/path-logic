import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    inject,
    model,
    Output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import type {
    ICorruptionReport,
    IExportFolderSummary,
    IExportMetadata,
    IImportOptions,
    IRecoveryAction
} from '../../../core/export-import';
import { ImportExportService } from '../../../services/import-export/import-export.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { CorruptionRecoveryDialogComponent } from '../corruption-recovery-dialog/corruption-recovery-dialog.component';

@Component({
    selector: 'app-import-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        PasswordModule,
        ProgressBarModule,
        CheckboxModule,
        SelectButtonModule,
        ToastModule,
        CorruptionRecoveryDialogComponent
    ],
    providers: [MessageService],
    templateUrl: './import-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportDialogComponent {
    /** Two-way Angular 21 Signal Model binding for dialog visibility */
    readonly visible = model<boolean>(false);

    @Output() importCompleted: EventEmitter<void> = new EventEmitter<void>();

    readonly importExportService: ImportExportService = inject(ImportExportService);
    readonly ledgerStore: LedgerStore = inject(LedgerStore);
    readonly messageService: MessageService = inject(MessageService);

    readonly step = signal<'scan' | 'inspect' | 'recovery' | 'importing'>('scan');
    readonly passphrase = signal<string>('');

    readonly availableFolders = signal<Array<IExportFolderSummary>>([]);
    readonly selectedFolder = signal<IExportFolderSummary | null>(null);
    readonly selectedMetadata = signal<IExportMetadata | null>(null);
    readonly corruptionReport = signal<ICorruptionReport | null>(null);
    readonly recoveryActions = signal<Array<IRecoveryAction>>([]);

    // Granular Selection Controls
    settingsSelectAll: boolean = true;
    options: IImportOptions = {
        settings: {
            mode: 'merge',
            categories: true,
            payees: true,
            recurringSchedules: true,
            featureFlags: true,
            userSettings: true
        },
        accountImportMode: 'merge',
        selectedAccountIdsToImport: [],
        existingAccountIdsToDelete: []
    };

    modeOptions = [
        { label: 'Merge Non-Conflicting', value: 'merge' },
        { label: 'Overwrite / Purge All', value: 'overwrite_all' }
    ];

    readonly statusMessage = signal<string>('');

    async openAndScan(): Promise<void> {
        this.step.set('scan');
        this.passphrase.set('');
        this.statusMessage.set('Scanning backup storage for export packages...');
        const folders = await this.importExportService.scanGDriveExports();
        this.availableFolders.set(folders);
        this.statusMessage.set(
            folders.length
                ? `Found ${folders.length} export package(s)`
                : 'No export packages found in backup storage.'
        );
    }

    async selectFolder(folder: IExportFolderSummary): Promise<void> {
        this.selectedFolder.set(folder);
        this.statusMessage.set('Verifying binary checksums & QIF parse integrity...');

        try {
            const { metadata, report } = await this.importExportService.verifyExportFolder(
                folder.folderId,
                this.passphrase()
            );
            this.selectedMetadata.set(metadata);
            this.corruptionReport.set(report);

            // Initialize account selections
            this.options.selectedAccountIdsToImport = (metadata.accounts || []).map(a => a.id);

            if (report.hasCorruption) {
                this.step.set('recovery');
            } else {
                this.step.set('inspect');
            }
        } catch (err: unknown) {
            if (folder.metadata) {
                this.selectedMetadata.set(folder.metadata);
                this.options.selectedAccountIdsToImport = (folder.metadata.accounts || []).map(
                    a => a.id
                );
                this.step.set('inspect');
            } else {
                const errMsg = this.extractErrorMessage(err);
                const detailedInfo = this.formatDetailedImportError(errMsg);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Folder Inspection Failed',
                    detail: detailedInfo,
                    life: 10000
                });
            }
        }
    }

    toggleSelectAllSettings(checked: boolean): void {
        this.settingsSelectAll = checked;
        this.options.settings.categories = checked;
        this.options.settings.payees = checked;
        this.options.settings.recurringSchedules = checked;
        this.options.settings.featureFlags = checked;
        this.options.settings.userSettings = checked;
    }

    toggleAccountSelection(accId: string, checked: boolean): void {
        if (checked) {
            if (!this.options.selectedAccountIdsToImport.includes(accId)) {
                this.options.selectedAccountIdsToImport.push(accId);
            }
        } else {
            this.options.selectedAccountIdsToImport =
                this.options.selectedAccountIdsToImport.filter(id => id !== accId);
        }
    }

    onRecoveryResolved(actions: Array<IRecoveryAction>): void {
        this.recoveryActions.set(actions);
        this.step.set('inspect');
    }

    async executeImport(): Promise<void> {
        const folder = this.selectedFolder();
        if (!folder) return;

        // Step 3: The import process
        this.step.set('importing');
        this.statusMessage.set('Importing selected ledgers and settings...');

        try {
            await this.importExportService.importGDriveExportPackage(
                folder.folderId,
                this.options,
                this.recoveryActions(),
                this.passphrase()
            );

            // Success: Toast notification
            this.messageService.add({
                severity: 'success',
                summary: 'Data Backup Restored',
                detail: 'Your financial accounts, transactions, and settings have been restored.',
                life: 5000
            });

            this.importCompleted.emit();

            // Success: Close the entire restore dialog
            this.close();
        } catch (err: unknown) {
            // Close the entire restore dialog on failure as requested
            this.close();

            // Error: Show detailed error Toast notification explaining failure root cause
            const rawMsg = this.extractErrorMessage(err);
            const detailedInfo = this.formatDetailedImportError(rawMsg);
            this.messageService.add({
                severity: 'error',
                summary: 'Import Failed',
                detail: detailedInfo,
                life: 12000
            });
        }
    }

    close(): void {
        this.statusMessage.set('');
        this.passphrase.set('');
        this.visible.set(false);
    }

    private extractErrorMessage(err: unknown): string {
        if (!err) return 'An unknown error occurred during import execution.';
        if (typeof err === 'string' && err.trim().length > 0) return err;
        if (err instanceof Error) {
            if (err.message && err.message.trim().length > 0) {
                return err.message;
            }
            if (err.name && err.name.trim().length > 0) {
                return `${err.name} error`;
            }
            if (err.cause) {
                return this.extractErrorMessage(err.cause);
            }
        }
        if (typeof err === 'object') {
            const obj = err as Record<string, unknown>;
            if (typeof obj['message'] === 'string' && obj['message'].trim().length > 0) {
                return obj['message'];
            }
            if (typeof obj['error'] === 'string' && obj['error'].trim().length > 0) {
                return obj['error'];
            }
            if (typeof obj['error'] === 'object' && obj['error'] !== null) {
                const subErr = obj['error'] as Record<string, unknown>;
                if (typeof subErr['message'] === 'string' && subErr['message'].trim().length > 0) {
                    return subErr['message'];
                }
            }
            if (typeof obj['statusText'] === 'string' && obj['statusText'].trim().length > 0) {
                return `HTTP ${obj['status'] || ''} ${obj['statusText']}`.trim();
            }
            try {
                const jsonStr = JSON.stringify(err);
                if (jsonStr !== '{}' && jsonStr !== '[]') {
                    return jsonStr;
                }
            } catch {
                // Ignore stringify error
            }
        }
        return String(err) || 'Unspecified runtime error during package import';
    }

    private formatDetailedImportError(rawMsg: string): string {
        const lowerMsg = rawMsg.toLowerCase();
        if (
            lowerMsg.includes('cipher') ||
            lowerMsg.includes('mac') ||
            lowerMsg.includes('decrypt') ||
            lowerMsg.includes('passphrase') ||
            lowerMsg.includes('key') ||
            lowerMsg.includes('operationerror')
        ) {
            return `Decryption Failed: Incorrect encryption key/passphrase or corrupted cipher payload. (${rawMsg})`;
        }
        if (
            lowerMsg.includes('checksum') ||
            lowerMsg.includes('sha-256') ||
            lowerMsg.includes('integrity') ||
            lowerMsg.includes('mismatch')
        ) {
            return `Data Corruption Detected: Package binary SHA-256 checksum mismatch. (${rawMsg})`;
        }
        if (
            lowerMsg.includes('network') ||
            lowerMsg.includes('storage') ||
            lowerMsg.includes('404') ||
            lowerMsg.includes('fetch') ||
            lowerMsg.includes('drive') ||
            lowerMsg.includes('token') ||
            lowerMsg.includes('auth') ||
            lowerMsg.includes('401') ||
            lowerMsg.includes('403')
        ) {
            return `Storage Provider Error: Unable to access or retrieve package files from storage. (${rawMsg})`;
        }
        if (lowerMsg.includes('qif') || lowerMsg.includes('parse')) {
            return `Parse Error: Invalid QIF transaction format in backup package. (${rawMsg})`;
        }
        return `Import Execution Failed: ${rawMsg}`;
    }
}
