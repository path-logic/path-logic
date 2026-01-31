import { describe, expect, it } from 'vitest';

import type { ISODateString, ITransaction } from '../domain/types';
import { Frequency, ScheduleType, PaymentMethod } from '../domain/types';
import type {
    CashflowProjection,
    IProjectionDataPoint,
    IProjectionInputs,
} from './CashflowProjection';
import { generateProjection } from './CashflowProjection';

describe('CashflowProjection', () => {
    it('should correctly project Bimonthly recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 90; // Jan, Feb, Mar
        const inputs: IProjectionInputs = {
            clearedBalance: 100000, // $1000
            pendingTransactions: new Array<ITransaction>(),
            recurringSchedules: [
                {
                    id: 'recurring-1',
                    accountId: 'acc-1',
                    payee: 'Bimonthly Rent',
                    amount: -50000, // -$500
                    type: ScheduleType.Debit,
                    frequency: Frequency.Bimonthly,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        } satisfies IProjectionInputs;

        const projection: CashflowProjection = generateProjection(startDate, days, inputs);

        // Should be due on Jan 01 and Mar 01 (monthDiff 0 and 2)
        const jan01: IProjectionDataPoint | undefined = projection.find(
            (p: IProjectionDataPoint) => p.date === '2026-01-01',
        );
        const feb01: IProjectionDataPoint | undefined = projection.find(
            (p: IProjectionDataPoint) => p.date === '2026-02-01',
        );
        const mar01: IProjectionDataPoint | undefined = projection.find(
            (p: IProjectionDataPoint) => p.date === '2026-03-01',
        );

        expect(jan01).toBeDefined();
        expect(jan01?.items).toHaveLength(1);
        expect(jan01?.items[0]?.description).toBe('Bimonthly Rent');

        expect(feb01).toBeDefined();
        expect(feb01?.items).toHaveLength(0);

        expect(mar01).toBeDefined();
        expect(mar01?.items).toHaveLength(1);
        expect(mar01?.items[0]?.description).toBe('Bimonthly Rent');
    });

    it('should correctly project Weekly recurring items', () => {
        const startDate: ISODateString = '2026-01-01'; // Thursday
        const days: number = 15;
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'a1',
                    payee: 'Weekly Subs',
                    amount: -10,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Weekly,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        };

        const projection = generateProjection(startDate, days, inputs);

        // Due on Jan 01, Jan 08, Jan 15
        const jan01 = projection.find(p => p.date === '2026-01-01');
        const jan08 = projection.find(p => p.date === '2026-01-08');
        const jan15 = projection.find(p => p.date === '2026-01-15');
        const other = projection.find(p => p.date === '2026-01-02');

        expect(jan01?.items).toHaveLength(1);
        expect(jan08?.items).toHaveLength(1);
        expect(jan15?.items).toHaveLength(1);
        expect(other?.items).toHaveLength(0);
    });

    it('should correctly project Monthly recurring items', () => {
        const startDate: ISODateString = '2026-01-15';
        const days: number = 40;
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'a1',
                    payee: 'Rent',
                    amount: -100,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Monthly,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-15',
                    endDate: null,
                    nextDueDate: '2026-01-15',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        };

        const projection = generateProjection(startDate, days, inputs);

        // Due on Jan 15, Feb 15
        const jan15 = projection.find(p => p.date === '2026-01-15');
        const feb15 = projection.find(p => p.date === '2026-02-15');

        expect(jan15?.items).toHaveLength(1);
        expect(feb15?.items).toHaveLength(1);
    });

    it('should correctly project Yearly recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 400; // Over a year
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'a1',
                    payee: 'Annual Sub',
                    amount: -50,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Yearly,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        };

        const projection = generateProjection(startDate, days, inputs);

        const jan01_2026 = projection.find(p => p.date === '2026-01-01');
        const jan01_2027 = projection.find(p => p.date === '2027-01-01');

        expect(jan01_2026?.items).toHaveLength(1);
        expect(jan01_2027?.items).toHaveLength(1);
    });

    it('should include pending transactions', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 5;
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [
                {
                    id: 'tx1',
                    accountId: 'a1',
                    date: '2026-01-03',
                    payee: 'Pending Tx',
                    memo: 'memo',
                    totalAmount: -20,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    status: 0 as any, // Pending mockup
                    splits: [],
                    checkNumber: null,
                    importHash: 'h',
                    createdAt: 'now',
                    updatedAt: 'now',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
            ],
            recurringSchedules: [],
        };

        const projection = generateProjection(startDate, days, inputs);
        const jan03 = projection.find(p => p.date === '2026-01-03');
        expect(jan03).toBeDefined();
        if (jan03) {
            expect(jan03.items).toBeDefined();
            if (jan03.items) {
                expect(jan03.items[0]?.type).toBe('pending');
            }
            expect(jan03.projectedBalance).toBe(980);
        }
    });

    it('should correctly project Daily recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 3;
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'a1',
                    payee: 'Daily Coffee',
                    amount: -5,
                    type: ScheduleType.Debit,
                    frequency: Frequency.Daily,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        };

        const projection = generateProjection(startDate, days, inputs);
        expect(projection[0]?.items).toHaveLength(1);
        expect(projection[1]?.items).toHaveLength(1);
        expect(projection[2]?.items).toHaveLength(1);
    });

    it('should correctly project Biweekly recurring items', () => {
        const startDate: ISODateString = '2026-01-01';
        const days: number = 20;
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'a1',
                    payee: 'Paycheck',
                    amount: 2000,
                    type: ScheduleType.Deposit,
                    frequency: Frequency.Biweekly,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        };

        const projection = generateProjection(startDate, days, inputs);
        // Jan 01 is day 0
        // Jan 15 is day 14
        expect(projection[0]?.items).toHaveLength(1);
        expect(projection[14]?.items).toHaveLength(1);
    });

    it('should return false for unknown frequency (default case)', () => {
        const startDate: ISODateString = '2026-01-01';
        const inputs: IProjectionInputs = {
            clearedBalance: 1000,
            pendingTransactions: [],
            recurringSchedules: [
                {
                    id: 'r1',
                    accountId: 'a1',
                    payee: 'Unknown',
                    amount: -5,
                    type: ScheduleType.Debit,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    frequency: 'UNKNOWN' as any,
                    paymentMethod: PaymentMethod.DirectDebit,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    lastOccurredDate: null,
                    splits: [],
                    memo: '',
                    autoPost: false,
                    isActive: true,
                },
            ],
        };
        const projection = generateProjection(startDate, 1, inputs);
        expect(projection[0]?.items).toHaveLength(0);
    });
});
