import {
    Cents,
    ISODateString,
    ITransaction,
    IRecurringSchedule,
    Frequency,
} from '../domain/types';

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
    const { clearedBalance, pendingTransactions, recurringSchedules } = inputs;

    const projection: CashflowProjection = new Array<IProjectionDataPoint>();
    let runningBalance = clearedBalance;

    for (let i = 0; i < days; i++) {
        const currentDate = addDays(startDate, i);
        const items: Array<IProjectedItem> = new Array<IProjectedItem>();
        let dailyDelta = 0;

        // 1. Add pending transactions due on this date
        for (const tx of pendingTransactions) {
            if (tx.date === currentDate) {
                dailyDelta += tx.totalAmount;
                items.push({
                    type: ProjectedItemType.Pending,
                    description: tx.payee,
                    amount: tx.totalAmount,
                    sourceId: tx.id,
                });
            }
        }

        // 2. Add recurring items due on this date
        for (const schedule of recurringSchedules) {
            if (isDueOnDate(schedule, currentDate)) {
                dailyDelta += schedule.amount;
                items.push({
                    type: ProjectedItemType.Recurring,
                    description: schedule.payee,
                    amount: schedule.amount,
                    sourceId: schedule.id,
                });
            }
        }

        runningBalance += dailyDelta;

        projection.push({
            date: currentDate,
            projectedBalance: runningBalance,
            delta: dailyDelta,
            items,
        });
    }

    return projection;
}

// === Helper Functions (Mocked/Simplified for now) ===

function addDays(date: string, days: number): string {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0] || '';
}

function isDueOnDate(schedule: IRecurringSchedule, date: string): boolean {
    if (!schedule.isActive) return false;
    if (date < schedule.startDate) return false;
    if (schedule.endDate && date > schedule.endDate) return false;

    const start = new Date(schedule.startDate + 'T00:00:00Z');
    const current = new Date(date + 'T00:00:00Z');

    // Simplistic frequency check for baseline implementation
    const diffTime = Math.abs(current.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (schedule.frequency) {
        case Frequency.Daily:
            return true;
        case Frequency.Weekly:
            return diffDays % 7 === 0;
        case Frequency.Biweekly:
            return diffDays % 14 === 0;
        case Frequency.Monthly:
            return current.getUTCDate() === start.getUTCDate();
        case Frequency.Yearly:
            return current.getUTCDate() === start.getUTCDate() && current.getUTCMonth() === start.getUTCMonth();
        default:
            return false;
    }
}
