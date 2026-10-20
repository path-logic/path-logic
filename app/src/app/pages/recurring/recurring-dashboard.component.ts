import { CommonModule } from '@angular/common';
import type { OnDestroy, TemplateRef } from '@angular/core';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { ISODateString, ITransaction } from '@core';
import {
    type IDetectedPattern,
    type IRecurringSchedule,
    Frequency,
    KnownCategory,
    Money,
    PaymentMethod,
    RecurringEngine,
    ScheduleType,
    TransactionStatus,
    detectRecurringPatterns
} from '@core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AppShellComponent } from '../../components/layout/app-shell/app-shell.component';
import { RecurringPaymentFormComponent } from '../../components/recurring/recurring-form/recurring-form.component';
import { LocalDatePipe } from '../../pipes/local-date.pipe';
import { LedgerStore } from '../../services/ledger-store/ledger.store';
import { SidebarContextService } from '../../services/sidebar-context/sidebar-context.service';

import { AiFeatureDialogComponent } from '../../components/ui/ai-feature-dialog/ai-feature-dialog.component';
import { SkeletonComponent } from '../../components/ui/skeleton';
import { GeminiService } from '../../services/gemini/gemini.service';

export interface ICalendarDayView {
    dateStr: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    hasBills: boolean;
    schedules: Array<IRecurringSchedule>;
    startOfDayBalance: number;
    endOfDayBalance: number;
}

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
        AppShellComponent,
        LocalDatePipe,
        SkeletonComponent,
        AiFeatureDialogComponent
    ],
    templateUrl: './recurring-dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringDashboardComponent implements OnDestroy {
    private ledgerStore = inject(LedgerStore);
    private router = inject(Router);
    private readonly sidebarContext = inject(SidebarContextService);
    readonly geminiService = inject(GeminiService);

    // Sidebar tools template ref
    readonly recurringSidebarTools = viewChild<TemplateRef<unknown>>('recurringSidebarTools');

    readonly schedules = this.ledgerStore.schedules;
    readonly accounts = this.ledgerStore.accounts;
    readonly transactions = this.ledgerStore.transactions;
    readonly isLoading = computed(
        () => !this.ledgerStore.isInitialized() || this.ledgerStore.isLoading()
    );

    readonly isDialogVisible = signal(false);
    readonly selectedSchedule = signal<Partial<IRecurringSchedule>>({});

    // Filter & Sidebar State
    readonly activeFilter = signal<'all' | 'due-soon' | 'autopost' | 'ai'>('all');

    // Selected Date for Day Inspection
    readonly selectedDate = signal<string | null>(null);

    // 2-Week Calendar State
    readonly calendarBaseDate = signal<Date>(new Date());

    // Analyze panel
    readonly isAnalyzeOpen = signal(false);
    readonly isAiExplanationOpen = signal(false);
    readonly detectedPatterns = signal<Array<IDetectedPattern>>([]);
    readonly skippedPatternPayees = signal<Set<string>>(new Set());

    readonly clearedBalance = computed(() =>
        this.transactions()
            .filter(tx => tx.status === TransactionStatus.Cleared)
            .reduce((sum, tx) => sum + tx.totalAmount, 0)
    );

    readonly activeSchedulesCount = computed(() => this.schedules().filter(s => s.isActive).length);

    readonly dueSoonCount = computed(() => {
        const now = new Date();
        return this.schedules().filter(s => {
            if (!s.isActive) return false;
            const due = new Date(s.nextDueDate);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
        }).length;
    });

    readonly autoPostCount = computed(
        () => this.schedules().filter(s => s.isActive && s.autoPost).length
    );

    readonly displayedSchedules = computed(() => {
        const date = this.selectedDate();
        let list = this.schedules();

        if (date) {
            list = list.filter(
                s =>
                    s.isActive &&
                    (s.nextDueDate === date ||
                        RecurringEngine.isDueOnDate(s, date as ISODateString))
            );
        }

        const filter = this.activeFilter();
        if (filter === 'due-soon') {
            const now = new Date();
            list = list.filter(s => {
                if (!s.isActive) return false;
                const due = new Date(s.nextDueDate);
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
            });
        } else if (filter === 'autopost') {
            list = list.filter(s => s.isActive && s.autoPost);
        }

        return list;
    });

    selectDate(dateStr: string): void {
        this.selectedDate.update(current => (current === dateStr ? null : dateStr));
    }

    clearSelectedDate(): void {
        this.selectedDate.set(null);
    }

    constructor() {
        effect(() => {
            const tools = this.recurringSidebarTools();
            if (tools) {
                this.sidebarContext.setContext(tools);
            }
        });
    }

    ngOnDestroy(): void {
        this.sidebarContext.clearContext();
    }

    /**
     * Computes the 14-day rolling calendar view with daily Start & End of Day balances.
     */
    readonly twoWeekDays = computed((): Array<ICalendarDayView> => {
        const base = new Date(this.calendarBaseDate());
        // Start from Monday of the base week
        const dayOfWeek = base.getDay(); // 0 is Sunday, 1 is Monday...
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startDate = new Date(base);
        startDate.setDate(base.getDate() + diffToMonday);

        const todayStr = new Date().toISOString().slice(0, 10);
        const days: Array<ICalendarDayView> = [];

        let runningBalance = this.clearedBalance();

        const allSchedules = this.schedules();
        const allTransactions = this.transactions();

        for (let i = 0; i < 14; i++) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + i);
            const dateStr = current.toISOString().slice(0, 10);

            // Find pending transactions on this date
            const dayPending = allTransactions
                .filter(tx => tx.status === TransactionStatus.Pending && tx.date === dateStr)
                .reduce((sum, tx) => sum + tx.totalAmount, 0);

            // Find scheduled items due on this date (including recurring intervals)
            const daySchedules = allSchedules.filter(
                s =>
                    s.isActive &&
                    (s.nextDueDate === dateStr ||
                        RecurringEngine.isDueOnDate(s, dateStr as ISODateString))
            );
            const daySchedAmount = daySchedules.reduce((sum, s) => {
                const isCredit =
                    s.type === ScheduleType.Deposit || s.type === ScheduleType.Paycheck;
                return sum + (isCredit ? s.amount : -s.amount);
            }, 0);

            const startOfDayBalance = runningBalance;
            const endOfDayBalance = startOfDayBalance + dayPending + daySchedAmount;
            runningBalance = endOfDayBalance;

            days.push({
                dateStr,
                dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: current.getDate(),
                isToday: dateStr === todayStr,
                hasBills: daySchedules.length > 0,
                schedules: daySchedules,
                startOfDayBalance,
                endOfDayBalance
            });
        }

        return days;
    });

    /**
     * Filtered days for the mobile Chronological Agenda view (only days with scheduled bills or Today).
     */
    readonly agendaDays = computed(() => {
        return this.twoWeekDays().filter(day => day.hasBills || day.isToday);
    });

    openAddSchedule(): void {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            void this.router.navigate(['/recurring/new']);
        } else {
            this.selectedSchedule.set({});
            this.isDialogVisible.set(true);
        }
    }

    nextTwoWeeks(): void {
        const next = new Date(this.calendarBaseDate());
        next.setDate(next.getDate() + 14);
        this.calendarBaseDate.set(next);
    }

    prevTwoWeeks(): void {
        const prev = new Date(this.calendarBaseDate());
        prev.setDate(prev.getDate() - 14);
        this.calendarBaseDate.set(prev);
    }

    resetToCurrentWeek(): void {
        this.calendarBaseDate.set(new Date());
    }

    get visiblePatterns(): Array<IDetectedPattern> {
        const skipped = this.skippedPatternPayees();
        return this.detectedPatterns().filter(
            p => !skipped.has(`${p.accountId}::${p.payee.toLowerCase().trim()}`)
        );
    }

    // Formatting Helpers
    formatCurrency(amount: number): string {
        return Money.formatCurrency(amount);
    }

    formatConfidence(confidence: number): string {
        return Math.round(confidence * 100) + '%';
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
        const today = new Date().toISOString().slice(0, 10) as ISODateString;
        this.selectedSchedule.set({
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            startDate: today,
            nextDueDate: today,
            autoPost: false,
            isActive: true,
            memo: '',
            splits: []
        });
        this.isDialogVisible.set(true);
    }

    openNewForSelectedDate(): void {
        const date = (this.selectedDate() ||
            new Date().toISOString().slice(0, 10)) as ISODateString;
        this.selectedSchedule.set({
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            startDate: date,
            nextDueDate: date,
            autoPost: false,
            isActive: true,
            memo: '',
            splits: []
        });
        this.isDialogVisible.set(true);
    }

    runAnalysis(): void {
        if (!this.geminiService.hasKey()) {
            this.isAiExplanationOpen.set(true);
            return;
        }
        this.executePatternDetection();
    }

    executePatternDetection(): void {
        const allTransactions = this.ledgerStore.transactions();
        const patterns = detectRecurringPatterns(allTransactions);
        this.detectedPatterns.set(patterns);
        this.skippedPatternPayees.set(new Set());
        this.isAnalyzeOpen.set(true);
    }

    handleRunOfflinePatterns(): void {
        this.isAiExplanationOpen.set(false);
        this.executePatternDetection();
    }

    acceptPattern(pattern: IDetectedPattern): void {
        const today = new Date().toISOString().slice(0, 10) as ISODateString;
        const prefilled: Partial<IRecurringSchedule> = {
            accountId: pattern.accountId,
            payee: pattern.payee,
            amount: Math.round(pattern.suggestedAmount),
            type: pattern.suggestedAmount < 0 ? ScheduleType.Debit : ScheduleType.Deposit,
            frequency: pattern.suggestedFrequency,
            startDate: today,
            nextDueDate: today,
            splits:
                pattern.mostRecentSplits.length > 0
                    ? pattern.mostRecentSplits
                    : [
                          {
                              id: `split-det-${Date.now()}`,
                              amount: Math.round(pattern.suggestedAmount),
                              memo: '',
                              categoryId: KnownCategory.Uncategorized
                          }
                      ],
            memo: pattern.mostRecentTransaction.memo ?? '',
            autoPost: false,
            isActive: true,
            endDate: null,
            lastOccurredDate: null,
            paymentMethod: PaymentMethod.Other
        };
        this.selectedSchedule.set(prefilled);
        this.isAnalyzeOpen.set(false);
        this.isDialogVisible.set(true);
    }

    skipPattern(pattern: IDetectedPattern): void {
        const key = `${pattern.accountId}::${pattern.payee.toLowerCase().trim()}`;
        this.skippedPatternPayees.update(s => new Set([...s, key]));
    }

    editSchedule(schedule: IRecurringSchedule): void {
        this.selectedSchedule.set({ ...schedule });
        this.isDialogVisible.set(true);
    }

    handleDelete(scheduleId: string): void {
        void this.ledgerStore.removeSchedule(scheduleId);
        this.isDialogVisible.set(false);
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

    handleSave(schedule: IRecurringSchedule | Partial<IRecurringSchedule>): void {
        const sched = { ...schedule };
        if (sched.nextDueDate && typeof sched.nextDueDate === 'object') {
            sched.nextDueDate = (sched.nextDueDate as Date)
                .toISOString()
                .slice(0, 10) as ISODateString;
        }
        if (sched.startDate && typeof sched.startDate === 'object') {
            sched.startDate = (sched.startDate as Date).toISOString().slice(0, 10) as ISODateString;
        }
        if (sched.id) {
            void this.ledgerStore.updateSchedule(sched as IRecurringSchedule);
        } else {
            const newSchedule: IRecurringSchedule = {
                ...(sched as IRecurringSchedule),
                id: 'sched-' + Date.now(),
                isActive: true,
                type: sched.type || ScheduleType.Debit
            };
            void this.ledgerStore.addSchedule(newSchedule);
        }
        this.isDialogVisible.set(false);
    }

    handleCancel(): void {
        this.isDialogVisible.set(false);
    }
}
