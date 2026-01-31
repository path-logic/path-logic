import type { Meta, StoryObj } from '@storybook/react';
import { RecurringPaymentForm } from '../RecurringPaymentForm';
import {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    type IAccount,
    type IRecurringSchedule,
} from '@path-logic/core';

const meta: Meta<typeof RecurringPaymentForm> = {
    title: 'Features/Recurring/PaymentForm',
    component: RecurringPaymentForm,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockAccounts = [
    {
        id: 'chase-1',
        name: 'Chase Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 500000,
        pendingBalance: 500000,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
    },
    {
        id: 'amex-1',
        name: 'Amex Gold',
        type: AccountType.Credit,
        institutionName: 'American Express',
        clearedBalance: -120000,
        pendingBalance: -120000,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
    },
];

export const CreateNew: Story = {
    args: {
        accounts: mockAccounts as Array<IAccount>,
        onSubmit: data => console.log('Submit:', data),
        onCancel: (): void => console.log('Cancel'),
    },
};

export const EditExisting: Story = {
    args: {
        accounts: mockAccounts as Array<IAccount>,
        initialData: {
            id: 's1',
            payee: 'Panther Psychology',
            amount: -250000,
            accountId: 'chase-1',
            frequency: Frequency.TwiceAMonth,
            paymentMethod: PaymentMethod.DirectDebit,
            startDate: '2026-03-01',
            autoPost: true,
            memo: 'Monthly therapy session',
            splits: [{ id: 's1-1', categoryId: 'health', amount: -250000, memo: 'Session Fee' }],
        } as Partial<IRecurringSchedule>,
        onCancel: (): void => console.log('Cancel'),
    },
};

export const Paycheck: Story = {
    args: {
        accounts: mockAccounts as Array<IAccount>,
        initialData: {
            id: 'p1',
            payee: 'Acme Corp',
            amount: 325000,
            type: ScheduleType.Paycheck,
            accountId: 'chase-1',
            frequency: Frequency.Biweekly,
            paymentMethod: PaymentMethod.DirectDeposit,
            startDate: '2026-02-01',
            autoPost: true,
            memo: 'Regular Salary',
            splits: [
                { id: 'p1-1', categoryId: 'income', amount: 500000, memo: 'Base Salary' },
                { id: 'p1-2', categoryId: 'tax', amount: -120000, memo: 'Federal income Tax' },
                { id: 'p1-3', categoryId: 'tax', amount: -45000, memo: 'State income Tax' },
                { id: 'p1-4', categoryId: 'savings', amount: -10000, memo: '401k Contribution' },
            ],
        } as Partial<IRecurringSchedule>,
        onSubmit: data => console.log('Update Paycheck:', data),
        onCancel: (): void => console.log('Cancel'),
    },
};
