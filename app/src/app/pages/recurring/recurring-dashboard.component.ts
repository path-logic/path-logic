import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type IRecurringSchedule, Money, ScheduleType } from '@core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { RecurringPaymentFormComponent } from '../../components/recurring/recurring-form/recurring-form.component';
import { LedgerStore } from '../../services/ledger-store/ledger.store';

@Component({
    selector: 'recurring-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        DialogModule,
        RecurringPaymentFormComponent,
        AppShellComponent
    ],
    templateUrl: './recurring-dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringDashboardComponent {
    private ledgerStore = inject(LedgerStore);

    schedules = this.ledgerStore.schedules;
    accounts = this.ledgerStore.accounts;

    isDialogVisible = signal(false);
    selectedSchedule = signal<Partial<IRecurringSchedule>>({});

    // Formatting Helpers
    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    getAccountName(id: string): string {
        return this.accounts().find(a => a.id === id)?.name || 'Unknown Account';
    }

    getStatusSeverity(schedule: IRecurringSchedule): 'success' | 'warn' | 'danger' | 'info' {
        if (!schedule.isActive) return 'info';

        const now = new Date();
        const due = new Date(schedule.nextDueDate);

        if (due < now) return 'danger'; // Overdue

        // Due within 7 days
        const diffTime = Math.abs(due.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) return 'warn';

        return 'success';
    }

    getStatusLabel(schedule: IRecurringSchedule): string {
        if (!schedule.isActive) return 'Inactive';

        const now = new Date();
        const due = new Date(schedule.nextDueDate);

        if (due < now) return 'Overdue';

        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) return 'Due Soon';

        return 'Scheduled';
    }

    // Actions
    openNew(): void {
        this.selectedSchedule.set({
            type: ScheduleType.Debit,
            splits: []
        });
        this.isDialogVisible.set(true);
    }

    editSchedule(schedule: IRecurringSchedule): void {
        this.selectedSchedule.set({ ...schedule });
        this.isDialogVisible.set(true);
    }

    postSchedule(schedule: IRecurringSchedule): void {
        // Here we would use the transaction engine to generate
        // the transaction based on the schedule, and then
        // send it to ledgerStore.addTransaction()
        // And update the schedule.lastOccurredDate and nextDueDate.

        // Simulated:
        alert('Posting transaction for ' + schedule.payee);
    }

    handleSave(schedule: Partial<IRecurringSchedule>): void {
        if (schedule.id) {
            this.ledgerStore.updateSchedule(schedule as IRecurringSchedule);
        } else {
            console.log('Saving new schedule', schedule);
            // new schedule
            schedule.id = 'sched-' + Date.now();
            schedule.isActive = true;
            if (!schedule.type) schedule.type = ScheduleType.Debit;
            this.ledgerStore.addSchedule(schedule as IRecurringSchedule);
        }
        this.isDialogVisible.set(false);
    }

    handleCancel(): void {
        this.isDialogVisible.set(false);
    }
}
