import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    Frequency,
    type IRecurringSchedule,
    type ISplit,
    PaymentMethod,
    ScheduleType,
} from '@path-logic/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { CalculatorInputComponent } from '../../ui/calculator-input/calculator-input.component';
import { RecurringSplitEditorComponent } from '../split-editor/split-editor.component';

@Component({
    selector: 'app-recurring-payment-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        SelectButtonModule,
        SelectModule,
        InputTextModule,
        DatePickerModule,
        ToggleSwitchModule,
        ButtonModule,
        DividerModule,
        CalculatorInputComponent,
        RecurringSplitEditorComponent,
    ],
    templateUrl: './recurring-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringPaymentFormComponent {
    @Input() schedule: Partial<IRecurringSchedule> = {
        type: ScheduleType.Debit,
        frequency: Frequency.Monthly,
        paymentMethod: PaymentMethod.ElectronicTransfer,
        autoPost: false,
        amount: 0,
        splits: [],
    };
    @Output() saved = new EventEmitter<Partial<IRecurringSchedule>>();
    @Output() cancelled = new EventEmitter<void>();

    @Input() accounts: Array<{ id: string; name: string }> = [];

    scheduleTypeOptions = [
        { label: 'Debit', value: ScheduleType.Debit },
        { label: 'Deposit', value: ScheduleType.Deposit },
        { label: 'Paycheck', value: ScheduleType.Paycheck },
    ];

    frequencyOptions = Object.values(Frequency).map(f => ({
        label: f.replace(/_/g, ' '),
        value: f,
    }));

    handleSave(): void {
        this.saved.emit(this.schedule);
    }

    handleCancel(): void {
        this.cancelled.emit();
    }

    onTypeChange(type: ScheduleType): void {
        this.schedule.type = type;
        if (type === ScheduleType.Paycheck) {
            // default to deposit styling
            this.schedule.paymentMethod = PaymentMethod.DirectDeposit;
        }
    }

    onSplitsChange(splits: Array<ISplit>): void {
        this.schedule.splits = splits;
    }
}
