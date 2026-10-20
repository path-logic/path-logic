import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
    formatCurrency,
    Frequency,
    type IRecurringSchedule,
    type ISODateString,
    type ITransaction,
    KnownCategory,
    PaymentMethod,
    RecurringEngine,
    ScheduleType,
    TransactionStatus
} from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { expect, userEvent, within } from 'storybook/test';

import { LedgerStore } from '../../services/ledger-store/ledger.store';
import {
    createMockLedgerStore,
    provideStoryFixtures,
    StoryPreset
} from '../../testing/story-fixtures';
import { RecurringPaymentFormComponent } from '../recurring/recurring-form/recurring-form.component';

@Component({
    selector: 'combo-recurring-workflow',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule, RecurringPaymentFormComponent],
    template: `
        <div class="h-screen bg-black/95 text-white flex flex-col p-6 gap-6 font-sans">
            <header class="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h1 class="text-xl font-bold tracking-tight">Recurring Workflow Simulator</h1>
                    <p class="text-white/60 text-sm">
                        Interactive verification of recurring schedule creation, frequency
                        management, and ledger posting.
                    </p>
                </div>
                <div class="flex items-center gap-6 text-xs text-white/70">
                    <div>
                        Active Schedules:
                        <span
                            data-testid="schedules-count"
                            class="font-mono text-emerald-400 font-bold"
                        >
                            {{ ledgerStore.schedules().length }}
                        </span>
                    </div>
                    <div>
                        Auto-Post Enabled:
                        <span data-testid="autopost-count" class="font-mono text-sky-400 font-bold">
                            {{ autoPostCount() }}
                        </span>
                    </div>
                    <div>
                        Ledger Transactions:
                        <span data-testid="tx-count" class="font-mono text-primary font-bold">
                            {{ ledgerStore.transactions().length }}
                        </span>
                    </div>
                </div>
            </header>

            <div class="flex justify-between items-center">
                <h2 class="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    Scheduled Bills & Income
                </h2>
                <button
                    type="button"
                    data-testid="add-schedule-btn"
                    (click)="openNewSchedule()"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                    <i class="pi pi-plus text-xs"></i>
                    Add Schedule
                </button>
            </div>

            <!-- Schedules Table -->
            <div class="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                <table class="w-full text-left text-sm">
                    <thead
                        class="bg-white/10 text-white/70 text-xs font-semibold uppercase tracking-wider"
                    >
                        <tr>
                            <th class="p-3">Payee / Description</th>
                            <th class="p-3">Amount</th>
                            <th class="p-3">Frequency</th>
                            <th class="p-3">Next Due</th>
                            <th class="p-3">Auto-Post</th>
                            <th class="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/10 text-white/90">
                        @for (sched of ledgerStore.schedules(); track sched.id) {
                            <tr
                                class="hover:bg-white/5 transition-colors"
                                [attr.data-testid]="'schedule-row-' + sched.id"
                            >
                                <td class="p-3 font-medium">{{ sched.payee }}</td>
                                <td
                                    class="p-3 font-mono"
                                    [class.text-rose-400]="sched.amount < 0"
                                    [class.text-emerald-400]="sched.amount > 0"
                                >
                                    {{ formatAmount(sched.amount) }}
                                </td>
                                <td class="p-3 capitalize">
                                    {{ sched.frequency.replace('_', ' ') }}
                                </td>
                                <td
                                    class="p-3 font-mono text-xs"
                                    [attr.data-testid]="'next-due-' + sched.id"
                                >
                                    {{ sched.nextDueDate.split('T')[0] }}
                                </td>
                                <td class="p-3">
                                    @if (sched.autoPost) {
                                        <span
                                            class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        >
                                            Auto
                                        </span>
                                    } @else {
                                        <span
                                            class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/40"
                                        >
                                            Manual
                                        </span>
                                    }
                                </td>
                                <td class="p-3 text-right space-x-2">
                                    <button
                                        type="button"
                                        [attr.data-testid]="'edit-schedule-' + sched.id"
                                        (click)="editSchedule(sched)"
                                        class="px-2.5 py-1 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        [attr.data-testid]="'post-schedule-' + sched.id"
                                        (click)="postSchedule(sched)"
                                        class="px-2.5 py-1 text-xs text-emerald-300 hover:text-white bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded transition-colors"
                                    >
                                        Post Now
                                    </button>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>

            <!-- Recent Posted Ledger Activity -->
            <div class="border border-white/10 rounded-xl p-4 bg-white/5 flex-1 overflow-auto">
                <h3 class="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Recent Posted Ledger Transactions
                </h3>
                <div class="space-y-2">
                    @for (tx of ledgerStore.transactions(); track tx.id) {
                        <div
                            class="flex justify-between items-center text-xs p-2 rounded bg-black/40 border border-white/5"
                            [attr.data-testid]="'tx-item-' + tx.id"
                        >
                            <div class="flex items-center gap-3">
                                <span class="font-mono text-white/40">{{ tx.date }}</span>
                                <span class="font-medium text-white/90">{{ tx.payee }}</span>
                                <span class="text-white/40">{{ tx.memo }}</span>
                            </div>
                            <div
                                class="font-mono font-bold"
                                [class.text-rose-400]="tx.totalAmount < 0"
                                [class.text-emerald-400]="tx.totalAmount > 0"
                            >
                                {{ formatAmount(tx.totalAmount) }}
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- Modal Dialog with RecurringPaymentFormComponent -->
            <p-dialog
                [(visible)]="isDialogVisible"
                [modal]="true"
                [header]="
                    selectedSchedule().id ? 'Edit Recurring Schedule' : 'New Recurring Schedule'
                "
                [style]="{ width: '52rem', maxWidth: '95vw' }"
                styleClass="p-fluid font-sans"
                appendTo="body"
            >
                <ng-template pTemplate="content">
                    <recurring-payment-form
                        [schedule]="selectedSchedule()"
                        [accounts]="accountOptions()"
                        (saved)="handleSave($event)"
                        (cancelled)="isDialogVisible.set(false)"
                        (deleted)="handleDelete($event)"
                    ></recurring-payment-form>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class ComboRecurringWorkflowComponent {
    readonly ledgerStore = inject(LedgerStore);
    readonly isDialogVisible = signal<boolean>(false);
    readonly selectedSchedule = signal<Partial<IRecurringSchedule>>({});

    readonly accountOptions = computed(() =>
        this.ledgerStore.accounts().map(a => ({ id: a.id, name: a.name }))
    );

    readonly autoPostCount = computed(
        () => this.ledgerStore.schedules().filter(s => s.autoPost).length
    );

    formatAmount(amount: number): string {
        return formatCurrency(amount);
    }

    openNewSchedule(): void {
        const today = new Date().toISOString().slice(0, 10) as ISODateString;
        const defaultAccount = this.ledgerStore.accounts()[0]?.id || 'acc-checking-01';
        this.selectedSchedule.set({
            accountId: defaultAccount,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            startDate: today,
            nextDueDate: today,
            autoPost: false,
            amount: 0,
            splits: []
        });
        this.isDialogVisible.set(true);
    }

    editSchedule(schedule: IRecurringSchedule): void {
        this.selectedSchedule.set({ ...schedule });
        this.isDialogVisible.set(true);
    }

    async handleSave(sched: Partial<IRecurringSchedule>): Promise<void> {
        const today = new Date().toISOString().slice(0, 10) as ISODateString;
        if (sched.id) {
            await this.ledgerStore.updateSchedule(sched as IRecurringSchedule);
        } else {
            const newSched: IRecurringSchedule = {
                id: `sched-${Date.now()}`,
                accountId: sched.accountId || 'acc-checking-01',
                payee: sched.payee || 'Unnamed Schedule',
                amount: sched.amount || 0,
                type: sched.type || ScheduleType.Debit,
                frequency: sched.frequency || Frequency.Monthly,
                startDate: (sched.startDate as string) || today,
                endDate: (sched.endDate as string) || null,
                nextDueDate: (sched.nextDueDate as string) || today,
                lastOccurredDate: null,
                autoPost: sched.autoPost ?? false,
                isActive: true,
                memo: sched.memo || '',
                paymentMethod: sched.paymentMethod || PaymentMethod.ElectronicTransfer,
                splits: sched.splits || []
            };
            await this.ledgerStore.addSchedule(newSched);
        }
        this.isDialogVisible.set(false);
    }

    async handleDelete(scheduleId: string): Promise<void> {
        await this.ledgerStore.removeSchedule(scheduleId);
        this.isDialogVisible.set(false);
    }

    async postSchedule(schedule: IRecurringSchedule): Promise<void> {
        const now = new Date().toISOString();
        const today = now.split('T')[0] as ISODateString;
        const payee = await this.ledgerStore.getOrCreatePayee(schedule.payee);
        const tx: ITransaction = {
            id: `tx-sched-${schedule.id}-${Date.now()}`,
            accountId: schedule.accountId,
            payeeId: payee.id,
            date: schedule.nextDueDate,
            payee: schedule.payee,
            memo: schedule.memo || `Recurring: ${schedule.frequency}`,
            totalAmount: schedule.amount,
            status: TransactionStatus.Pending,
            checkNumber: null,
            importHash: `sched-${schedule.id}-${schedule.nextDueDate}`,
            splits:
                schedule.splits && schedule.splits.length > 0
                    ? schedule.splits
                    : [
                          {
                              id: `split-sched-${schedule.id}-${Date.now()}`,
                              amount: schedule.amount,
                              memo: schedule.memo || '',
                              categoryId: KnownCategory.Uncategorized
                          }
                      ],
            createdAt: now as ISODateString,
            updatedAt: now as ISODateString
        };

        await this.ledgerStore.addTransaction(tx);

        const nextDueDate = RecurringEngine.calculateNextDueDate(
            schedule.startDate,
            schedule.frequency,
            schedule.nextDueDate
        );

        await this.ledgerStore.updateSchedule({
            ...schedule,
            lastOccurredDate: today,
            nextDueDate
        });
    }
}

export const sharedMockLedgerStore = createMockLedgerStore(StoryPreset.ActiveLedger);

const meta: Meta<ComboRecurringWorkflowComponent> = {
    title: 'Combo Compositions/7. Recurring Workflow',
    component: ComboRecurringWorkflowComponent,
    includeStories: [
        'DefaultScheduleView',
        'InteractiveCreateScheduleFlow',
        'InteractiveAutoPostFlow'
    ],
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: provideStoryFixtures({ customLedger: sharedMockLedgerStore })
        })
    ]
};

export default meta;
type Story = StoryObj<ComboRecurringWorkflowComponent>;

export const DefaultScheduleView: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        // Verify initial counts and schedules rendered
        const schedulesCount = await body.findByTestId('schedules-count');
        expect(schedulesCount.textContent?.trim()).toBe('2');

        const autoPostCount = await body.findByTestId('autopost-count');
        expect(autoPostCount.textContent?.trim()).toBe('1');

        const rentRow = await body.findByTestId('schedule-row-sched-rent-01');
        expect(rentRow.textContent).toContain('Highland Properties');

        const electricRow = await body.findByTestId('schedule-row-sched-electric-01');
        expect(electricRow.textContent).toContain('Metro Electric');
    }
};

export const InteractiveCreateRecurringSchedule: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        // 1. Click Add Schedule button
        const addBtn = await body.findByTestId('add-schedule-btn');
        await userEvent.click(addBtn);

        // 2. Locate dialog
        const dialog = await body.findByRole('dialog');
        await expect(dialog).toBeInTheDocument();
        expect(await within(dialog).findByText(/New Recurring Schedule/i)).toBeInTheDocument();

        // 3. Fill in Payee
        const payeeInput = await within(dialog).findByLabelText(/Payee \/ Description/i);
        await userEvent.clear(payeeInput);
        await userEvent.type(payeeInput, 'Netflix Subscription');

        // 4. Fill in Amount and blur
        const amountInput = await within(dialog).findByLabelText(/Amount/i);
        await userEvent.clear(amountInput);
        await userEvent.type(amountInput, '22.99');
        await userEvent.tab();

        // 5. Toggle Auto-Post switch
        const autoPostSwitch = await within(dialog).findByRole('switch', {
            name: /Automatic Entry/i
        });
        await userEvent.click(autoPostSwitch);

        // 6. Click Save Schedule button
        const saveBtn = await within(dialog).findByRole('button', { name: /Save Schedule/i });
        await userEvent.click(saveBtn);

        // 7. Verify schedule table updated reactively
        await new Promise(resolve => setTimeout(resolve, 300));
        expect(await body.findByText(/Netflix Subscription/i)).toBeInTheDocument();

        const updatedCount = await body.findByTestId('schedules-count');
        expect(updatedCount.textContent?.trim()).toBe('3');

        const updatedAutoPost = await body.findByTestId('autopost-count');
        expect(updatedAutoPost.textContent?.trim()).toBe('2');
    }
};

export const InteractivePostOccurrenceFlow: Story = {
    play: async ({ canvasElement }) => {
        sharedMockLedgerStore.reset();
        await new Promise(resolve => setTimeout(resolve, 300));
        const body = within(canvasElement.ownerDocument.body);

        // 1. Initial ledger transaction count
        const initialTxCountElem = await body.findByTestId('tx-count');
        const initialTxCount = parseInt(initialTxCountElem.textContent?.trim() || '0', 10);

        // 2. Find and click Post Now for Metro Electric
        const postElectricBtn = await body.findByTestId('post-schedule-sched-electric-01');
        await userEvent.click(postElectricBtn);

        // 3. Verify ledger transactions incremented
        await new Promise(resolve => setTimeout(resolve, 300));
        const newTxCountElem = await body.findByTestId('tx-count');
        expect(parseInt(newTxCountElem.textContent?.trim() || '0', 10)).toBe(initialTxCount + 1);

        // 4. Verify transaction item rendered in recent ledger preview
        expect(await body.findByText(/Electric bill/i)).toBeInTheDocument();

        // 5. Verify next due date on schedule advanced
        const nextDueElem = await body.findByTestId('next-due-sched-electric-01');
        // Initial was 2026-10-15, next due for monthly is 2026-11-15
        expect(nextDueElem.textContent?.trim()).toContain('2026-11-15');
    }
};
