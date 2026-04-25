import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';

/**
 * Non-blocking import progress overlay.
 * Appears while parsing/reconciling — positioned over the ledger table.
 * Disappears automatically when stage reaches 'done' or 'error'.
 */
@Component({
    selector: 'import-progress-overlay',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './import-progress-overlay.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportProgressOverlayComponent {
    readonly importService = inject(ImportOrchestrationService);

    readonly cancelled = output();

    readonly progress = this.importService.progress;

    readonly isVisible = computed(() => {
        const stage = this.progress().stage;
        return stage !== 'idle' && stage !== 'done' && stage !== 'cancelled';
    });

    readonly stageLabel = computed(() => {
        switch (this.progress().stage) {
            case 'reading':
                return 'Reading File';
            case 'parsing':
                return 'Parsing Transactions';
            case 'reconciling':
                return 'Checking for Duplicates';
            case 'error':
                return 'Import Failed';
            default:
                return 'Processing';
        }
    });

    readonly stageIndex = computed(() => {
        switch (this.progress().stage) {
            case 'reading':
                return 0;
            case 'parsing':
                return 1;
            case 'reconciling':
                return 2;
            default:
                return 2;
        }
    });

    readonly stages = ['Reading', 'Parsing', 'Reconciling'];

    readonly counterText = computed(() => {
        const { processed, total } = this.progress();
        if (total === 0) return '';
        return `${processed.toLocaleString()} / ${total.toLocaleString()} transactions`;
    });

    handleCancel(): void {
        this.importService.cancel();
        this.cancelled.emit();
    }

    readonly X = X;
}
