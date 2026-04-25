import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ISODateString, ITransaction } from '@core';
import {
    type IRecurringSchedule,
    KnownCategory,
    Money,
    RecurringEngine,
    ScheduleType,
    TransactionStatus
} from '@core';
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

    /**
     * Posts a recurring schedule as a real ledger transaction and advances
     * the nextDueDate to the next occurrence.
     */
    async postSchedule(schedule: IRecurringSchedule): Promise<void> {
        const now = new Date().toISOString();
        const today = now.split('T')[0] as ISODateString;

        // Get or create a payee record for this schedule
        const payee = await this.ledgerStore.getOrCreatePayee(schedule.payee);

        // Build a real transaction from the schedule
        const tx: ITransaction = {
            id: `tx-sched-${schedule.id}-${Date.now()}`,
            accountId: schedule.accountId,
            payeeId: payee.id,
            date: schedule.nextDueDate,
            payee: schedule.payee,
            memo: schedule.memo,
            totalAmount: schedule.amount,
            status: TransactionStatus.Pending,
            checkNumber: null,
            importHash: `sched-${schedule.id}-${schedule.nextDueDate}`,
            splits:
                schedule.splits.length > 0
                    ? schedule.splits
                    : [
                          {
                              id: `split-sched-${schedule.id}-${Date.now()}`,
                              amount: schedule.amount,
                              memo: schedule.memo,
                              categoryId: KnownCategory.Uncategorized
                          }
                      ],
            createdAt: now as ISODateString,
            updatedAt: now as ISODateString
        };

        await this.ledgerStore.addTransaction(tx);

        // Advance the schedule's nextDueDate using the RecurringEngine
        const nextDueDate = RecurringEngine.calculateNextDueDate(
            schedule.startDate,
            schedule.frequency,
            schedule.nextDueDate
        );

        const updatedSchedule: IRecurringSchedule = {
            ...schedule,
            lastOccurredDate: today,
            nextDueDate
        };

        await this.ledgerStore.updateSchedule(updatedSchedule);
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
