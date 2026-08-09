import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    EventEmitter,
    inject,
    model,
    Output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { ImportExportService } from '../../../services/import-export/import-export.service';

@Component({
    selector: 'app-export-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        PasswordModule,
        ProgressBarModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './export-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportDialogComponent {
    /** Two-way Angular 21 Signal Model binding for dialog visibility */
    readonly visible = model<boolean>(false);

    @Output() exportCompleted: EventEmitter<string> = new EventEmitter<string>();

    readonly importExportService: ImportExportService = inject(ImportExportService);
    readonly messageService: MessageService = inject(MessageService);

    readonly passphrase = signal<string>('');
    readonly isProcessing = signal<boolean>(false);
    readonly statusMessage = signal<string>('');
    readonly createdFolderName = signal<string>('');

    readonly isPassphraseValid = computed(() => {
        const val = this.passphrase();
        return !!val && val.trim().length >= 8;
    });

    async startExport(): Promise<void> {
        if (!this.isPassphraseValid()) {
            return;
        }

        this.isProcessing.set(true);
        this.statusMessage.set('Encrypting accounts and settings...');

        try {
            const result = await this.importExportService.exportToGDrive(this.passphrase());
            this.createdFolderName.set(result.folderName);

            // Trigger success toast notification
            this.messageService.add({
                severity: 'success',
                summary: 'Data Backup Created',
                detail: 'Your financial accounts and settings have been encrypted and saved.',
                life: 5000
            });

            this.exportCompleted.emit(result.folderName);

            // Close dialog immediately upon export success
            this.close();
        } catch (err: unknown) {
            // Keep dialog open ONLY if an error occurred so user can fix or retry
            this.statusMessage.set(
                `Export failed: ${err instanceof Error ? err.message : String(err)}`
            );
        } finally {
            this.isProcessing.set(false);
        }
    }

    close(): void {
        this.statusMessage.set('');
        this.passphrase.set('');
        this.visible.set(false);
    }
}
