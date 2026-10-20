import { Frequency, KnownCategory, PaymentMethod, ScheduleType } from '@core';
import Lara from '@primeuix/themes/lara';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RecurringPaymentFormComponent } from './recurring-form.component';

const meta: Meta<RecurringPaymentFormComponent> = {
    title: 'Components/Recurring Payment Form',
    component: RecurringPaymentFormComponent,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded'
    },
    decorators: [
        applicationConfig({
            providers: [
                providePrimeNG({
                    theme: {
                        preset: Lara,
                        options: {
                            darkModeSelector: '.dark'
                        }
                    }
                })
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<RecurringPaymentFormComponent>;

export const Default: Story = {
    args: {
        schedule: {
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            autoPost: true,
            amount: 5000,
            payee: 'Internet Bill',
            splits: []
        },
        accounts: [
            { id: '1', name: 'Main Checking' },
            { id: '2', name: 'Savings' }
        ],
        saved: fn(),
        cancelled: fn(),
        deleted: fn()
    }
};

export const PaycheckMode: Story = {
    args: {
        schedule: {
            type: ScheduleType.Paycheck,
            frequency: Frequency.Biweekly,
            paymentMethod: PaymentMethod.DirectDeposit,
            autoPost: true,
            amount: 500000,
            payee: 'Employer Inc',
            splits: [
                { id: 's1', categoryId: KnownCategory.GrossPay, amount: 600000, memo: 'Gross Pay' },
                {
                    id: 's2',
                    categoryId: KnownCategory.FederalTax,
                    amount: -65000,
                    memo: 'Federal Tax'
                },
                { id: 's3', categoryId: KnownCategory.StateTax, amount: -25000, memo: 'State Tax' },
                {
                    id: 's4',
                    categoryId: KnownCategory.SocialSecurity,
                    amount: -10000,
                    memo: 'Social Security'
                }
            ]
        },
        accounts: [{ id: '1', name: 'Main Checking' }],
        saved: fn(),
        cancelled: fn(),
        deleted: fn()
    }
};

export const PaycheckWithBreakoutAndCustomFields: Story = {
    args: {
        schedule: {
            type: ScheduleType.Paycheck,
            frequency: Frequency.Biweekly,
            paymentMethod: PaymentMethod.DirectDeposit,
            autoPost: true,
            amount: 345000,
            payee: 'Acme Corporation',
            splits: [
                { id: 's1', categoryId: KnownCategory.GrossPay, amount: 500000, memo: 'Gross Pay' },
                {
                    id: 's2',
                    categoryId: KnownCategory.FederalTax,
                    amount: -65000,
                    memo: 'Federal Tax'
                },
                { id: 's3', categoryId: KnownCategory.StateTax, amount: -25000, memo: 'State Tax' },
                {
                    id: 's4',
                    categoryId: KnownCategory.SocialSecurity,
                    amount: -31000,
                    memo: 'Social Security'
                },
                { id: 's5', categoryId: KnownCategory.Medicare, amount: -7250, memo: 'Medicare' },
                {
                    id: 's6',
                    categoryId: KnownCategory.HealthInsurance,
                    amount: -15000,
                    memo: 'Medical'
                },
                {
                    id: 's7',
                    categoryId: KnownCategory.DentalInsurance,
                    amount: -2500,
                    memo: 'Dental'
                },
                {
                    id: 's8',
                    categoryId: KnownCategory.VisionInsurance,
                    amount: -1500,
                    memo: 'Vision'
                },
                { id: 's9', categoryId: KnownCategory.FourOhOneK, amount: -5000, memo: '401(k)' },
                { id: 's10', categoryId: KnownCategory.HSA, amount: -2750, memo: 'HSA' },
                {
                    id: 's11',
                    categoryId: KnownCategory.Roth401k,
                    amount: -4000,
                    memo: 'Roth 401(k)'
                },
                {
                    id: 's12',
                    categoryId: KnownCategory.LifeInsurance,
                    amount: -1000,
                    memo: 'Life Insurance'
                }
            ]
        },
        accounts: [
            { id: '1', name: 'Main Checking' },
            { id: '2', name: 'High Yield Savings' }
        ],
        saved: fn(),
        cancelled: fn(),
        deleted: fn()
    }
};

export const PaycheckInteractiveWorkflow: Story = {
    args: {
        ...PaycheckWithBreakoutAndCustomFields.args
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // 1. Verify Payee Input
        const payeeInput = canvas.getByPlaceholderText(/e\.g\. Acme Corp/i);
        await expect(payeeInput).toHaveValue('Acme Corporation');

        // 2. Tab Navigation & Assertions
        // Default tab is Wages
        await expect(canvas.getByText(/Gross Pay/i)).toBeInTheDocument();

        // Switch to Taxes
        const taxesTab = canvas.getByRole('button', { name: /Taxes/i });
        await userEvent.click(taxesTab);
        await expect(canvas.getByText(/Federal Tax/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Social Security/i)).toBeInTheDocument();

        // Add a custom tax
        const addTaxBtn = canvas.getByRole('button', { name: /Add Tax/i });
        await userEvent.click(addTaxBtn);
        const taxMemoInput = canvas.getByPlaceholderText(/State Disability, SUI/i);
        await userEvent.type(taxMemoInput, 'Local Surcharge');

        // Switch to Pre-Tax
        const preTaxTab = canvas.getByRole('button', { name: /Pre-Tax/i });
        await userEvent.click(preTaxTab);
        await expect(canvas.getByText(/Medical/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Vision/i)).toBeInTheDocument();

        // Add a custom pre-tax deduction
        const addPreTaxBtn = canvas.getByRole('button', { name: /Add Pre-Tax Deduction/i });
        await userEvent.click(addPreTaxBtn);
        const preTaxMemoInput = canvas.getByPlaceholderText(/Commuter, Transit/i);
        await userEvent.type(preTaxMemoInput, 'Transit Pass');

        // Switch to Post-Tax
        const postTaxTab = canvas.getByRole('button', { name: /Post-Tax/i });
        await userEvent.click(postTaxTab);
        await expect(canvas.getByText(/Roth 401\(k\)/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Life Insurance/i)).toBeInTheDocument();

        // Add a custom post-tax deduction
        const addPostTaxBtn = canvas.getByRole('button', { name: /Add Post-Tax Deduction/i });
        await userEvent.click(addPostTaxBtn);
        const postTaxMemoInput = canvas.getByPlaceholderText(/ESPP, Union Dues/i);
        await userEvent.type(postTaxMemoInput, 'ESPP Plan');

        // Switch back to Wages
        const wagesTab = canvas.getByRole('button', { name: /Wages/i });
        await userEvent.click(wagesTab);
        await expect(canvas.getByText(/Gross Pay/i)).toBeInTheDocument();

        // 3. Save Schedule verification
        const saveButton = canvas.getByRole('button', { name: /Save Schedule/i });
        await expect(saveButton).toBeEnabled();
        await userEvent.click(saveButton);
        await expect(args.saved).toHaveBeenCalled();
    }
};

export const PaycheckDialogModal: Story = {
    args: {
        ...PaycheckWithBreakoutAndCustomFields.args
    },
    decorators: [
        storyFn => ({
            template: `
                <div class="fixed inset-0 flex items-center justify-center bg-black/40 p-4 z-50">
                    <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-2xl w-full max-w-[52rem] overflow-hidden">
                        <div class="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-850">
                            <h2 class="text-base font-bold text-surface-900 dark:text-surface-100">Edit Recurring Schedule</h2>
                            <button type="button" class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 cursor-pointer">
                                <i class="pi pi-times text-sm"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <ng-container *ngComponentOutlet="storyFn()"></ng-container>
                        </div>
                    </div>
                </div>
            `
        })
    ]
};

export const PaycheckMobileViewport: Story = {
    args: {
        ...PaycheckWithBreakoutAndCustomFields.args
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1'
        }
    }
};

export const PaycheckDarkMode: Story = {
    args: {
        ...PaycheckWithBreakoutAndCustomFields.args
    },
    parameters: {
        themes: {
            current: 'dark'
        }
    },
    decorators: [
        storyFn => ({
            template: `
                <div class="dark bg-surface-950 p-6 rounded-2xl">
                    <ng-container *ngComponentOutlet="storyFn()"></ng-container>
                </div>
            `
        })
    ]
};

export const EditExistingSchedule: Story = {
    args: {
        schedule: {
            id: 'sched-123',
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            autoPost: true,
            amount: 12000,
            payee: 'Electric Co',
            startDate: '2026-09-01',
            nextDueDate: '2026-09-15',
            splits: []
        },
        accounts: [
            { id: '1', name: 'Main Checking' },
            { id: '2', name: 'Emergency Savings' }
        ],
        saved: fn(),
        cancelled: fn(),
        deleted: fn()
    }
};

export const DepositModeWithSplits: Story = {
    args: {
        schedule: {
            type: ScheduleType.Deposit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.DirectDeposit,
            autoPost: true,
            amount: 250000,
            payee: 'Freelance Client',
            accountId: '1',
            startDate: '2026-09-01',
            nextDueDate: '2026-09-15',
            splits: [
                { id: 'd1', categoryId: 'cat-retainer', amount: 200000, memo: 'Monthly Retainer' },
                {
                    id: 'd2',
                    categoryId: 'cat-reimbursement',
                    amount: 50000,
                    memo: 'Software License'
                }
            ]
        },
        accounts: [
            { id: '1', name: 'Main Checking' },
            { id: '2', name: 'Emergency Savings' }
        ],
        saved: fn(),
        cancelled: fn(),
        deleted: fn()
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // 1. Verify field ordering: Account, Payee, Amount, Frequency, Next Occurrence
        await expect(canvas.getByText('Main Checking')).toBeInTheDocument();
        const payeeInput = canvas.getByPlaceholderText(/e\.g\. Acme Corp/i);
        await expect(payeeInput).toHaveValue('Freelance Client');

        // 2. Verify split table rows render with borderless table entries and padding
        await expect(canvas.getByDisplayValue('cat-retainer')).toBeInTheDocument();
        await expect(canvas.getByDisplayValue('Monthly Retainer')).toBeInTheDocument();

        // 3. Add a new split
        const addSplitBtn = canvas.getByRole('button', { name: /Add Split/i });
        await userEvent.click(addSplitBtn);

        // 4. Save the schedule
        const saveBtn = canvas.getByRole('button', { name: /Save Schedule/i });
        await userEvent.click(saveBtn);
        await expect(args.saved).toHaveBeenCalled();
    }
};

export const DebitModeWithSplits: Story = {
    args: {
        schedule: {
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            autoPost: false,
            amount: 180000,
            payee: 'Property Management Co',
            accountId: '1',
            startDate: '2026-09-01',
            nextDueDate: '2026-09-05',
            splits: [
                { id: 's1', categoryId: 'cat-rent', amount: 150000, memo: 'Apartment Rent' },
                { id: 's2', categoryId: 'cat-parking', amount: 30000, memo: 'Garage Parking' }
            ]
        },
        accounts: [{ id: '1', name: 'Main Checking' }],
        saved: fn(),
        cancelled: fn(),
        deleted: fn()
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByDisplayValue('Apartment Rent')).toBeInTheDocument();
        await expect(canvas.getByDisplayValue('Garage Parking')).toBeInTheDocument();

        // Remove a split
        const removeButtons = canvas.getAllByRole('button', { name: /Remove split line/i });
        await userEvent.click(removeButtons[1]!);
        await expect(canvas.queryByDisplayValue('Garage Parking')).toBeNull();

        // Save
        const saveBtn = canvas.getByRole('button', { name: /Save Schedule/i });
        await userEvent.click(saveBtn);
        await expect(args.saved).toHaveBeenCalled();
    }
};
