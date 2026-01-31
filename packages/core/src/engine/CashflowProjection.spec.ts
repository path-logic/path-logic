/* eslint-disable simple-import-sort/imports */
import { describe, expect, it } from 'vitest';

import {
    Frequency,
    type ISODateString,
    type ITransaction,
    PaymentMethod,
    ScheduleType,
    TransactionStatus,
} from '../domain/types';
import {
    type CashflowProjection,
    type IProjectionInputs,
    generateProjection,
} from './CashflowProjection';

describe('CashflowProjection', () => {
    it('should correctly project Bimonthly recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 90; // Jan, Feb, Mar
        const inputs: IProjectionInputs = {
            clearedBalance: 100000, // $1,000.00
            pendingTransactions: new Array<ITransaction>(),
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'acc1',
                    payee: 'Netflix',
                    amount: -1599,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Bimonthly,
                    startDate: '2026-01-15',
                    endDate: null,
                    nextDueDate: '2026-01-15',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);

        // Should occur Jan 15 and Mar 15 (Every 2 months)
        const jan15 = result.find(d => d.date === '2026-01-15');
        const mar15 = result.find(d => d.date === '2026-03-15');

        if (!jan15 || !mar15) {
            throw new Error('Test data points not found');
        }
        const jan15First = jan15.items[0];
        const mar15First = mar15.items[0];
        if (!jan15First || !mar15First) {
            throw new Error('Test items not found');
        }
        expect(jan15First.amount).toBe(-1599);
        expect(mar15First.amount).toBe(-1599);
    });

    it('should correctly project Quarterly recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 180; // 6 months
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: new Array<ITransaction>(),
            recurringSchedules: [
                {
                    id: 'r2',
                    accountId: 'acc1',
                    payee: 'Water Bill',
                    amount: -5000,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Quarterly,
                    startDate: '2026-02-01',
                    endDate: null,
                    nextDueDate: '2026-02-01',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);

        // Should occur Feb 1 and May 1
        const feb01 = result.find(d => d.date === '2026-02-01');
        const mar01 = result.find(d => d.date === '2026-03-01');
        const apr01 = result.find(d => d.date === '2026-04-01');
        const may01 = result.find(d => d.date === '2026-05-01');

        expect(feb01?.items.length).toBe(1);
        expect(mar01?.items.length).toBe(0);
        expect(apr01?.items.length).toBe(0);
        expect(may01?.items.length).toBe(1);
    });

    it('should correctly project TwiceAMonth (1st and 15th) recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 45;
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: new Array<ITransaction>(),
            recurringSchedules: [
                {
                    id: 'r3',
                    accountId: 'acc1',
                    payee: 'Rent',
                    amount: -200000,
                    type: ScheduleType.Debit,
                    frequency: Frequency.TwiceAMonth,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);

        const jan01 = result.find(d => d.date === '2026-01-01');
        const jan15 = result.find(d => d.date === '2026-01-15');
        const feb01 = result.find(d => d.date === '2026-02-01');

        expect(jan01?.items.length).toBe(1);
        expect(jan15?.items.length).toBe(1);
        expect(feb01?.items.length).toBe(1);
    });

    it('should correctly project Yearly recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 450; // Over a year
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: new Array<ITransaction>(),
            recurringSchedules: [
                {
                    id: 'r4',
                    accountId: 'acc1',
                    payee: 'Amazon Prime',
                    amount: -13900,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Yearly,
                    startDate: '2026-02-10',
                    endDate: null,
                    nextDueDate: '2026-02-10',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);

        const event1 = result.find(d => d.date === '2026-02-10');
        const event2 = result.find(d => d.date === '2027-02-10');

        if (!event1 || !event2) {
            throw new Error('Test data points not found');
        }

        expect(event1.items.length).toBe(1);
        expect(event2.items.length).toBe(1);
    });

    it('should handle multiple overlapping recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 31;
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: new Array<ITransaction>(),
            recurringSchedules: [
                {
                    id: 'weekly',
                    accountId: 'acc1',
                    payee: 'Grocery',
                    amount: -10000,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Weekly,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
                {
                    id: 'monthly',
                    accountId: 'acc1',
                    payee: 'Salary',
                    amount: 500000,
                    type: ScheduleType.Deposit,
                    frequency: Frequency.Monthly,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    paymentMethod: PaymentMethod.DirectDeposit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);

        const jan01 = result.find(d => d.date === '2026-01-01');
        const jan08 = result.find(d => d.date === '2026-01-08');

        expect(jan01?.items.length).toBe(2); // Weekly + Monthly
        expect(jan01?.delta).toBe(490000); // 500000 - 10000
        expect(jan08?.items.length).toBe(1); // Weekly only
    });

    it('should correctly handle pending transactions', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 5;
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: [
                {
                    id: 'p1',
                    accountId: 'acc1',
                    payee: 'Manual Entry',
                    totalAmount: -5000,
                    date: '2026-01-03',
                    status: TransactionStatus.Pending,
                    splits: [],
                    payeeId: 'p1',
                    memo: '',
                    checkNumber: null,
                    importHash: '',
                    createdAt: '',
                    updatedAt: '',
                },
            ],
            recurringSchedules: [],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);

        const jan03 = result.find(d => d.date === '2026-01-03');
        if (!jan03) throw new Error('jan03 not found');
        const jan03First = jan03.items[0];
        if (!jan03First) throw new Error('jan03 item not found');
        expect(jan03First.type).toBe('pending');
    });

    it('should respect schedule isActive flag', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 31;
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'inactive',
                    accountId: 'acc1',
                    payee: 'Gym',
                    amount: -5000,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Monthly,
                    startDate: '2026-01-15',
                    endDate: null,
                    nextDueDate: '2026-01-15',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: false,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);
        const jan15 = result.find(d => d.date === '2026-01-15');

        expect(jan15?.items.length).toBe(0);
    });

    it('should respect schedule startDate/endDate', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 60;
        const inputs: IProjectionInputs = {
            clearedBalance: 100000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'limited',
                    accountId: 'acc1',
                    payee: 'Short Term Subs',
                    amount: -1000,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Monthly,
                    startDate: '2026-01-15',
                    endDate: '2026-01-31', // Only should occur once
                    nextDueDate: '2026-01-15',
                    paymentMethod: PaymentMethod.DirectDebit,
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: true,
                    isActive: true,
                },
            ],
        };

        const result: CashflowProjection = generateProjection(startDate, days, inputs);
        const jan15 = result.find(d => d.date === '2026-01-15');
        const feb15 = result.find(d => d.date === '2026-02-15');

        expect(jan15?.items.length).toBe(1);
        expect(feb15?.items.length).toBe(0);
    });
});
