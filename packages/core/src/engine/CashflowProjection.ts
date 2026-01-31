import type { Cents, IRecurringSchedule, ISODateString, ITransaction } from '../domain/types';
import { RecurringEngine } from './RecurringEngine';

export enum ProjectedItemType {
    Pending = 'pending',
    Recurring = 'recurring',
}

export interface IProjectedItem {
    type: ProjectedItemType;
    description: string;
    amount: Cents;
    sourceId: string;
}

export interface IProjectionDataPoint {
    date: ISODateString;
    projectedBalance: Cents;
    delta: Cents; // Change from previous day
    items: Array<IProjectedItem>; // Transactions affecting this day
}

export type CashflowProjection = Array<IProjectionDataPoint>;

export interface IProjectionInputs {
    clearedBalance: Cents;
    pendingTransactions: Array<ITransaction>;
    recurringSchedules: Array<IRecurringSchedule>;
}

/**
 * Generates a forward-looking balance forecast.
 */
export function generateProjection(
    startDate: ISODateString,
    days: number,
    inputs: IProjectionInputs,
): CashflowProjection {
    const { clearedBalance, pendingTransactions, recurringSchedules }: IProjectionInputs = inputs;

    const projection: CashflowProjection = new Array<IProjectionDataPoint>();
    let runningBalance: Cents = clearedBalance;

    for (let i: number = 0; i < days; i++) {
        const currentDate: ISODateString = addDays(startDate, i);
        const items: Array<IProjectedItem> = new Array<IProjectedItem>();
        let dailyDelta: Cents = 0;

        // 1. Add pending transactions due on this date
        for (const tx of pendingTransactions) {
            if (tx.date === currentDate) {
                dailyDelta += tx.totalAmount;
                items.push({
                    type: ProjectedItemType.Pending,
                    description: tx.payee,
                    amount: tx.totalAmount,
                    sourceId: tx.id,
                } satisfies IProjectedItem);
            }
        }

        // 2. Add recurring items due on this date
        for (const schedule of recurringSchedules) {
            if (RecurringEngine.isDueOnDate(schedule, currentDate)) {
                dailyDelta += schedule.amount;
                items.push({
                    type: ProjectedItemType.Recurring,
                    description: schedule.payee,
                    amount: schedule.amount,
                    sourceId: schedule.id,
                } satisfies IProjectedItem);
            }
        }

        runningBalance += dailyDelta;

        projection.push({
            date: currentDate,
            projectedBalance: runningBalance,
            delta: dailyDelta,
            items: items,
        } satisfies IProjectionDataPoint);
    }

    return projection;
}

// === Helper Functions (Mocked/Simplified for now) ===

function addDays(date: string, days: number): string {
    const d: Date = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0] || '';
}
