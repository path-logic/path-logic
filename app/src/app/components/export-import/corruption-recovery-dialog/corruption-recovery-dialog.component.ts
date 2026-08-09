import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import type { ICorruptionReport, IRecoveryAction } from '../../../core/export-import';

@Component({
    selector: 'app-corruption-recovery-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule],
    templateUrl: './corruption-recovery-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CorruptionRecoveryDialogComponent {
    @Input() folderName: string = '';
    @Input() report!: ICorruptionReport;
    @Output() recoveryResolved: EventEmitter<Array<IRecoveryAction>> = new EventEmitter<
        Array<IRecoveryAction>
    >();

    manualAdjustmentAmounts: Record<string, number> = {};

    getDiscrepancyDollars(cents: number): number {
        return cents / 100;
    }

    applyRecovery(): void {
        const actions: Array<IRecoveryAction> = [];

        for (const acc of this.report.corruptedAccounts || []) {
            const manualDollars = this.manualAdjustmentAmounts[acc.accountId];
            const finalCents =
                manualDollars !== undefined
                    ? Math.round(manualDollars * 100)
                    : acc.discrepancyCents;

            actions.push({
                accountId: acc.accountId,
                dropCorrupted: true,
                reconciliationAdjustmentCents: finalCents,
                reconciliationMemo: `Automated recovery entry for discrepancy of $${(finalCents / 100).toFixed(2)}`
            });
        }

        this.recoveryResolved.emit(actions);
    }
}
