import { KnownCategory, ScheduleType } from '@core';
import Lara from '@primeuix/themes/lara';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';
import { expect, userEvent, within } from 'storybook/test';

import { RecurringSplitEditorComponent } from './split-editor.component';

const meta: Meta<RecurringSplitEditorComponent> = {
    title: 'Components/Recurring Split Editor',
    component: RecurringSplitEditorComponent,
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
type Story = StoryObj<RecurringSplitEditorComponent>;

export const DefaultPaycheck: Story = {
    args: {
        scheduleType: ScheduleType.Paycheck,
        amount: 0,
        splits: []
    }
};

export const PopulatedPaycheck: Story = {
    args: {
        scheduleType: ScheduleType.Paycheck,
        amount: 345000, // $3,450.00 Net
        splits: [
            { id: 's1', categoryId: KnownCategory.GrossPay, amount: 500000, memo: 'Gross Pay' },
            { id: 's2', categoryId: KnownCategory.FederalTax, amount: -65000, memo: 'Federal Tax' },
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
            { id: 's7', categoryId: KnownCategory.DentalInsurance, amount: -2500, memo: 'Dental' },
            { id: 's8', categoryId: KnownCategory.VisionInsurance, amount: -1500, memo: 'Vision' },
            { id: 's9', categoryId: KnownCategory.FourOhOneK, amount: -5000, memo: '401(k)' },
            { id: 's10', categoryId: KnownCategory.HSA, amount: -2750, memo: 'HSA' },
            { id: 's11', categoryId: KnownCategory.Roth401k, amount: -4000, memo: 'Roth 401(k)' },
            {
                id: 's12',
                categoryId: KnownCategory.LifeInsurance,
                amount: -1000,
                memo: 'Life Insurance'
            }
        ]
    }
};

export const InteractiveTabNavigation: Story = {
    args: {
        scheduleType: ScheduleType.Paycheck,
        amount: 345000,
        splits: PopulatedPaycheck.args?.splits ?? []
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify initial active tab is Wages
        await expect(canvas.getByText(/Gross Pay/i)).toBeInTheDocument();

        // Navigate to Taxes tab
        const taxesTab = canvas.getByRole('button', { name: /Taxes/i });
        await userEvent.click(taxesTab);
        await expect(canvas.getByText(/Federal Tax/i)).toBeInTheDocument();
        await expect(canvas.getByText(/State Tax/i)).toBeInTheDocument();

        // Navigate to Pre-Tax tab
        const preTaxTab = canvas.getByRole('button', { name: /Pre-Tax/i });
        await userEvent.click(preTaxTab);
        await expect(canvas.getByText(/401\(k\) \/ Retirement/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Medical/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Vision/i)).toBeInTheDocument();

        // Navigate to Post-Tax tab
        const postTaxTab = canvas.getByRole('button', { name: /Post-Tax/i });
        await userEvent.click(postTaxTab);
        await expect(canvas.getByText(/Roth 401\(k\)/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Life Insurance/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Disability Insurance/i)).toBeInTheDocument();

        // Return to Wages tab
        const wagesTab = canvas.getByRole('button', { name: /Wages/i });
        await userEvent.click(wagesTab);
        await expect(canvas.getByText(/Gross Pay/i)).toBeInTheDocument();
    }
};

export const InteractiveCustomFields: Story = {
    args: {
        scheduleType: ScheduleType.Paycheck,
        amount: 400000,
        splits: [
            { id: 'w1', categoryId: KnownCategory.GrossPay, amount: 400000, memo: 'Gross Pay' }
        ]
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Add a custom Wage
        const addWageBtn = canvas.getByRole('button', { name: /Add Wage/i });
        await userEvent.click(addWageBtn);
        const wageMemoInput = canvas.getByPlaceholderText(/Bonus, Overtime/i);
        await userEvent.type(wageMemoInput, 'Quarterly Bonus');

        // 2. Switch to Taxes and Add Custom Tax
        const taxesTab = canvas.getByRole('button', { name: /Taxes/i });
        await userEvent.click(taxesTab);
        const addTaxBtn = canvas.getByRole('button', { name: /Add Tax/i });
        await userEvent.click(addTaxBtn);
        const taxMemoInput = canvas.getByPlaceholderText(/State Disability, SUI/i);
        await userEvent.type(taxMemoInput, 'City Tax');

        // 3. Switch to Pre-Tax and Add Custom Pre-Tax Deduction
        const preTaxTab = canvas.getByRole('button', { name: /Pre-Tax/i });
        await userEvent.click(preTaxTab);
        const addPreTaxBtn = canvas.getByRole('button', { name: /Add Pre-Tax Deduction/i });
        await userEvent.click(addPreTaxBtn);
        const preTaxMemoInput = canvas.getByPlaceholderText(/Commuter, Transit/i);
        await userEvent.type(preTaxMemoInput, 'Transit Pass');

        // 4. Switch to Post-Tax and Add Custom Post-Tax Deduction
        const postTaxTab = canvas.getByRole('button', { name: /Post-Tax/i });
        await userEvent.click(postTaxTab);
        const addPostTaxBtn = canvas.getByRole('button', { name: /Add Post-Tax Deduction/i });
        await userEvent.click(addPostTaxBtn);
        const postTaxMemoInput = canvas.getByPlaceholderText(/ESPP, Union Dues/i);
        await userEvent.type(postTaxMemoInput, 'Employee Stock');

        // 5. Remove the custom Post-Tax field
        const deleteBtn = canvas.getByRole('button', { name: /Remove post-tax deduction/i });
        await userEvent.click(deleteBtn);
        await expect(canvas.queryByPlaceholderText(/ESPP, Union Dues/i)).toBeNull();
    }
};

export const StandardSplitMode: Story = {
    args: {
        scheduleType: ScheduleType.Debit,
        amount: 15000,
        splits: [
            { id: 's1', categoryId: 'cat-groceries', amount: 10000, memo: 'Food' },
            { id: 's2', categoryId: 'cat-household', amount: 5000, memo: 'Cleaning' }
        ]
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 1. Verify split rows render with category and memo
        await expect(canvas.getByDisplayValue('cat-groceries')).toBeInTheDocument();
        await expect(canvas.getByDisplayValue('Food')).toBeInTheDocument();
        await expect(canvas.getByDisplayValue('cat-household')).toBeInTheDocument();
        await expect(canvas.getByDisplayValue('Cleaning')).toBeInTheDocument();

        // 2. Add a new split
        const addSplitBtn = canvas.getByRole('button', { name: /Add Split/i });
        await userEvent.click(addSplitBtn);

        // 3. Type into new split
        const categoryInputs = canvas.getAllByPlaceholderText(/Category ID\.\.\./i);
        const lastCategoryInput = categoryInputs[categoryInputs.length - 1]!;
        await userEvent.type(lastCategoryInput, 'cat-utilities');

        const memoInputs = canvas.getAllByPlaceholderText(/Memo\.\.\./i);
        const lastMemoInput = memoInputs[memoInputs.length - 1]!;
        await userEvent.type(lastMemoInput, 'Internet');

        // 4. Remove the first split
        const removeButtons = canvas.getAllByRole('button', { name: /Remove split line/i });
        await userEvent.click(removeButtons[0]!);
        await expect(canvas.queryByDisplayValue('Food')).toBeNull();
    }
};

export const DepositSplitMode: Story = {
    args: {
        scheduleType: ScheduleType.Deposit,
        amount: 250000,
        splits: [
            {
                id: 'd1',
                categoryId: 'cat-consulting',
                amount: 200000,
                memo: 'Consulting Retainer'
            },
            {
                id: 'd2',
                categoryId: 'cat-reimbursement',
                amount: 50000,
                memo: 'Expense Reimbursement'
            }
        ]
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByDisplayValue('Consulting Retainer')).toBeInTheDocument();
        await expect(canvas.getByDisplayValue('Expense Reimbursement')).toBeInTheDocument();

        const addSplitBtn = canvas.getByRole('button', { name: /Add Split/i });
        await userEvent.click(addSplitBtn);

        const memoInputs = canvas.getAllByPlaceholderText(/Memo\.\.\./i);
        const newMemoInput = memoInputs[memoInputs.length - 1];
        expect(newMemoInput).toBeDefined();
        if (newMemoInput) {
            await userEvent.type(newMemoInput, 'Per Diem');
        }
    }
};
