import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import type { IRecurringSchedule, ISODateString } from '@core';
import { Frequency, PaymentMethod, ScheduleType } from '@core';

import { AppShellComponent } from '../../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

@Component({
    selector: 'recurring-schedule-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, AppShellComponent],
    templateUrl: './recurring-schedule-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringScheduleFormComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    readonly ledgerStore = inject(LedgerStore);

    // Form signals
    readonly scheduleId = signal<string | null>(null);
    readonly payee = signal<string>('');
    readonly type = signal<ScheduleType>(ScheduleType.Debit);
    readonly amount = signal<string>('');
    readonly accountId = signal<string>('');
    readonly categoryName = signal<string>('');
    readonly memo = signal<string>('');
    readonly frequency = signal<Frequency>(Frequency.Monthly);
    readonly nextDueDate = signal<string>(new Date().toISOString().split('T')[0] || '');
    readonly autoPost = signal<boolean>(false);
    readonly isSubmitting = signal<boolean>(false);
    readonly errorMessage = signal<string | null>(null);

    // Computed states
    readonly isEditMode = computed(() => !!this.scheduleId());
    readonly accounts = computed(() => this.ledgerStore.accounts());
    readonly payees = computed(() => this.ledgerStore.payees());
    readonly categories = computed(() => this.ledgerStore.categories());

    readonly typeOptions = [
        { label: 'Debit / Bill', value: ScheduleType.Debit, icon: 'pi-arrow-up-right' },
        { label: 'Deposit / Income', value: ScheduleType.Deposit, icon: 'pi-arrow-down-left' },
        { label: 'Paycheck', value: ScheduleType.Paycheck, icon: 'pi-money-bill' }
    ];

    readonly frequencyOptions = [
        { label: 'Weekly', value: Frequency.Weekly },
        { label: 'Bi-Weekly', value: Frequency.Biweekly },
        { label: 'Every 4 Weeks', value: Frequency.EveryFourWeeks },
        { label: 'Monthly', value: Frequency.Monthly },
        { label: 'Twice a Month', value: Frequency.TwiceAMonth },
        { label: 'Bi-Monthly', value: Frequency.Bimonthly },
        { label: 'Quarterly', value: Frequency.Quarterly },
        { label: 'Yearly', value: Frequency.Yearly }
    ];

    ngOnInit(): void {
        // Pre-select first account if available
        const firstAccount = this.accounts()[0];
        if (firstAccount && !this.accountId()) {
            this.accountId.set(firstAccount.id);
        }

        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.scheduleId.set(id);
                const existing = this.ledgerStore.schedules().find(s => s.id === id);
                if (existing) {
                    this.loadSchedule(existing);
                }
            }
        });

        this.route.queryParams.subscribe(params => {
            if (!this.scheduleId()) {
                if (params['payee']) this.payee.set(params['payee']);
                if (params['amount']) this.amount.set(params['amount']);
                if (params['type']) this.type.set(params['type'] as ScheduleType);
                if (params['memo']) this.memo.set(params['memo']);
            }
        });
    }

    loadSchedule(sched: IRecurringSchedule): void {
        this.scheduleId.set(sched.id);
        this.payee.set(sched.payee || '');
        this.type.set(sched.type || ScheduleType.Debit);
        this.amount.set((sched.amount / 100).toFixed(2));
        this.accountId.set(sched.accountId || '');
        this.memo.set(sched.memo || '');
        this.frequency.set(sched.frequency || Frequency.Monthly);
        if (sched.nextDueDate) {
            this.nextDueDate.set(sched.nextDueDate.split('T')[0] || '');
        }
        this.autoPost.set(!!sched.autoPost);
    }

    handleTypeSelect(type: ScheduleType): void {
        this.type.set(type);
    }

    async handleSave(): Promise<void> {
        const trimmedPayee = this.payee().trim();
        if (!trimmedPayee) {
            this.errorMessage.set('Payee / Name is required');
            return;
        }

        const parsedAmount = parseFloat(this.amount() || '0');
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            this.errorMessage.set('Please enter a valid amount greater than 0');
            return;
        }

        if (!this.accountId()) {
            this.errorMessage.set('Please select an account');
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set(null);

        try {
            const amountCents = Math.round(parsedAmount * 100);
            const now = new Date().toISOString() as ISODateString;
            const currentId = this.scheduleId();
            const dueDateISO = new Date(this.nextDueDate()).toISOString() as ISODateString;

            if (currentId) {
                const existing = this.ledgerStore.schedules().find(s => s.id === currentId);
                const updated: IRecurringSchedule = {
                    id: currentId,
                    accountId: this.accountId(),
                    payee: trimmedPayee,
                    amount: amountCents,
                    type: this.type(),
                    frequency: this.frequency(),
                    paymentMethod: existing?.paymentMethod || PaymentMethod.ElectronicTransfer,
                    startDate: existing?.startDate || now,
                    endDate: existing?.endDate || null,
                    nextDueDate: dueDateISO,
                    lastOccurredDate: existing?.lastOccurredDate || null,
                    splits: existing?.splits || [],
                    memo: this.memo().trim(),
                    autoPost: this.autoPost(),
                    isActive: existing?.isActive ?? true
                };
                await this.ledgerStore.updateSchedule(updated);
            } else {
                const newSchedule: IRecurringSchedule = {
                    id: `sched-${Date.now()}`,
                    accountId: this.accountId(),
                    payee: trimmedPayee,
                    amount: amountCents,
                    type: this.type(),
                    frequency: this.frequency(),
                    paymentMethod: PaymentMethod.ElectronicTransfer,
                    startDate: now,
                    endDate: null,
                    nextDueDate: dueDateISO,
                    lastOccurredDate: null,
                    splits: [],
                    memo: this.memo().trim(),
                    autoPost: this.autoPost(),
                    isActive: true
                };
                await this.ledgerStore.addSchedule(newSchedule);
            }

            void this.router.navigate(['/recurring']);
        } catch (err: unknown) {
            console.error('Failed to save recurring schedule:', err);
            this.errorMessage.set('Failed to save schedule. Please check fields and try again.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    handleCancel(): void {
        void this.router.navigate(['/recurring']);
    }
}
