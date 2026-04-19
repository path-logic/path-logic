import { CommonModule } from '@angular/common';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type ISplit, KnownCategory, ScheduleType } from '@core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { CalculatorInputComponent } from '../../ui/calculator-input/calculator-input.component';

export interface IPaycheckFormState {
    grossPay: number;
    federalTax?: number;
    stateTax?: number;
    localTax?: number;
    socialSecurity?: number;
    medicare?: number;
    healthInsurance?: number;
    visionInsurance?: number;
    dentalInsurance?: number;
    fourOhOneK?: number;
    hsa?: number;
    otherDeductions?: Array<{ memo: string; amount: number; categoryId?: string }>;
}

@Component({
    selector: 'recurring-split-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        CalculatorInputComponent
    ],
    templateUrl: './split-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringSplitEditorComponent implements OnChanges {
    @Input() scheduleType: ScheduleType = ScheduleType.Debit;
    @Input() splits: Array<ISplit> = [];
    @Input() amount: number = 0; // Total parent amount
    @Output() splitsChange = new EventEmitter<Array<ISplit>>();

    ScheduleType = ScheduleType;

    editingSplits: Array<ISplit> = [];

    // Paycheck State
    paycheckState: IPaycheckFormState = { grossPay: 0 };
    KnownCategory = KnownCategory;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['splits']) {
            this.editingSplits = [...this.splits];
            if (this.scheduleType === ScheduleType.Paycheck) {
                this.parseSplitsToPaycheckState(this.splits);
            }
        }
    }

    addSplit(): void {
        this.editingSplits = [
            ...this.editingSplits,
            { id: `split-${Date.now()}`, categoryId: null, memo: '', amount: 0 }
        ];
        this.emitUpdates();
    }

    removeSplit(id: string): void {
        this.editingSplits = this.editingSplits.filter(s => s.id !== id);
        this.emitUpdates();
    }

    updateSplit(index: number, field: keyof ISplit, value: string | number | null): void {
        const updated = [...this.editingSplits];
        updated[index] = { ...updated[index], [field]: value } as ISplit;
        this.editingSplits = updated;
        this.emitUpdates();
    }

    // Paycheck logic
    updatePaycheckField(field: keyof IPaycheckFormState, value: number): void {
        this.paycheckState = { ...this.paycheckState, [field]: value };
        this.emitPaycheckUpdates();
    }

    private emitUpdates(): void {
        this.splitsChange.emit(this.editingSplits);
    }

    private emitPaycheckUpdates(): void {
        const generatedSplits: Array<ISplit> = [];
        let _netAmount: number = this.paycheckState.grossPay;

        if (this.paycheckState.grossPay) {
            generatedSplits.push({
                id: 'split-gross-pay',
                categoryId: KnownCategory.GrossPay,
                memo: 'Gross Pay',
                amount: this.paycheckState.grossPay
            });
        }

        const addDeduction = (amt: number | undefined, cat: string, memo: string): void => {
            if (amt && amt !== 0) {
                const deductionAmount = amt > 0 ? -amt : amt;
                generatedSplits.push({
                    id: `split-${cat}`,
                    categoryId: cat,
                    memo,
                    amount: deductionAmount
                });
                _netAmount += deductionAmount;
            }
        };

        addDeduction(this.paycheckState.federalTax, KnownCategory.FederalTax, 'Federal Tax');
        addDeduction(this.paycheckState.stateTax, KnownCategory.StateTax, 'State Tax');
        addDeduction(
            this.paycheckState.socialSecurity,
            KnownCategory.SocialSecurity,
            'Social Security'
        );
        addDeduction(this.paycheckState.medicare, KnownCategory.Medicare, 'Medicare');
        addDeduction(this.paycheckState.fourOhOneK, KnownCategory.FourOhOneK, '401k');
        addDeduction(
            this.paycheckState.healthInsurance,
            KnownCategory.HealthInsurance,
            'Health Insurance'
        );

        // Other deductions would loop here

        // Note: netAmount should match totalAmount in parent. Parent should validate this.
        this.editingSplits = generatedSplits;
        this.emitUpdates();
    }

    private parseSplitsToPaycheckState(splits: Array<ISplit>): void {
        const state: IPaycheckFormState = { grossPay: 0 };
        for (const s of splits) {
            const amt = Math.abs(s.amount);
            switch (s.categoryId) {
                case KnownCategory.GrossPay:
                    state.grossPay = s.amount;
                    break;
                case KnownCategory.FederalTax:
                    state.federalTax = amt;
                    break;
                case KnownCategory.StateTax:
                    state.stateTax = amt;
                    break;
                case KnownCategory.SocialSecurity:
                    state.socialSecurity = amt;
                    break;
                case KnownCategory.Medicare:
                    state.medicare = amt;
                    break;
                case KnownCategory.FourOhOneK:
                    state.fourOhOneK = amt;
                    break;
                case KnownCategory.HealthInsurance:
                    state.healthInsurance = amt;
                    break;
            }
        }
        this.paycheckState = state;
    }
}
