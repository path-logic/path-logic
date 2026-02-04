import type { Meta, StoryObj } from '@storybook/nextjs';
import { within, expect } from '@storybook/test';
import { RecurringSummaryTable } from '../RecurringSummaryTable';
import {
    Frequency,
    PaymentMethod,
    AccountType,
    type IRecurringSchedule,
    type IAccount,
} from '@path-logic/core';

const meta: Meta<typeof RecurringSummaryTable> = {
    title: 'Features/Recurring/SummaryTable',
    component: RecurringSummaryTable,
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

const mockSchedules = [
    {
        id: 's1',
        accountId: 'chase-1',
        payee: 'Panther Psychology',
        amount: -2500,
        frequency: Frequency.Weekly,
        paymentMethod: PaymentMethod.DirectDebit,
        startDate: '2023-09-13',
        endDate: null,
        nextDueDate: '2026-02-15', // Assuming today is after this in future/test context
        lastOccurredDate: '2026-02-08',
        splits: [{ id: 's1-1', categoryId: 'health', amount: -2500, memo: '' }],
        memo: '',
        autoPost: false,
        isActive: true,
    },
    {
        id: 's2',
        accountId: 'chase-1',
        payee: 'evermore',
        amount: -563274,
        frequency: Frequency.TwiceAMonth,
        paymentMethod: PaymentMethod.DirectDeposit,
        startDate: '2022-02-28',
        endDate: null,
        nextDueDate: '2026-02-28',
        lastOccurredDate: '2026-02-15',
        splits: [
            { id: 's2-1', categoryId: 'rent', amount: -563274, memo: 'Monthly Apartment Rent' },
        ],
        memo: '',
        autoPost: true,
        isActive: true,
    },
    {
        id: 's3',
        accountId: 'amex-1',
        payee: 'Equinox',
        amount: -30000,
        frequency: Frequency.Monthly,
        paymentMethod: PaymentMethod.DirectDebit,
        startDate: '2023-01-01',
        endDate: null,
        nextDueDate: '2026-03-01',
        lastOccurredDate: '2026-02-01',
        splits: [{ id: 's3-1', categoryId: 'fitness', amount: -30000, memo: '' }],
        memo: '',
        autoPost: true,
        isActive: true,
    },
    {
        id: 's4',
        accountId: 'chase-1',
        payee: 'Google One',
        amount: -999,
        frequency: Frequency.Yearly,
        paymentMethod: PaymentMethod.ElectronicTransfer,
        startDate: '2022-08-01',
        endDate: null,
        nextDueDate: '2426-08-01', // Far future
        lastOccurredDate: '2025-08-01',
        splits: [{ id: 's4-1', categoryId: 'tech', amount: -999, memo: '' }],
        memo: '',
        autoPost: true,
        isActive: true,
    },
];

export const Default: Story = {
    args: {
        schedules: mockSchedules as Array<IRecurringSchedule>,
        accounts: mockAccounts as Array<IAccount>,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Verify headers
        await expect(canvas.getByText('Payee')).toBeVisible();
        await expect(canvas.getByText('Amount')).toBeVisible();
        // Verify data row
        await expect(canvas.getByText('Panther Psychology')).toBeVisible();
        await expect(canvas.getByText('-$25.00')).toBeVisible(); // 2500 cents
        await expect(canvas.getByText('Weekly')).toBeVisible();
    },
};

export const WithOverdue: Story = {
    args: {
        schedules: [
            {
                ...mockSchedules[0],
                nextDueDate: '2023-09-13', // VERY overdue
            },
            ...mockSchedules.slice(1),
        ] as Array<IRecurringSchedule>,
        accounts: mockAccounts as Array<IAccount>,
    },
};
