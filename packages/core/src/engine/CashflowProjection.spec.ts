import { describe, expect, it } from 'vitest';

import type { ISODateString, ITransaction } from '../domain/types';
import { Frequency } from '../domain/types';
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
                    frequency: Frequency.Bimonthly,
                    startDate: '2026-01-01',
                    endDate: null,
                    nextDueDate: '2026-01-01',
                    categoryId: 'cat-1',
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
});
