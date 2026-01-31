import { Frequency, type IRecurringSchedule, type ISODateString } from '../domain/types';

export const RecurringEngine = {
    /**
     * Calculates the next due date after the provided target date.
     */
    calculateNextDueDate(
        startDate: ISODateString,
        frequency: Frequency,
        lastDueDate?: ISODateString,
    ): ISODateString {
        const baseDateString = lastDueDate || startDate;
        const baseDate = new Date(baseDateString + 'T00:00:00Z');

        switch (frequency) {
            case Frequency.Daily:
                return this.addDays(baseDate, 1);
            case Frequency.Weekly:
                return this.addDays(baseDate, 7);
            case Frequency.Biweekly:
                return this.addDays(baseDate, 14);
            case Frequency.EveryFourWeeks:
                return this.addDays(baseDate, 28);
            case Frequency.Monthly:
                return this.addMonths(baseDate, 1);
            case Frequency.TwiceAMonth:
                return this.calculateNextSemiMonthly(baseDate);
            case Frequency.Bimonthly:
                return this.addMonths(baseDate, 2);
            case Frequency.Quarterly:
                return this.addMonths(baseDate, 3);
            case Frequency.Yearly:
                return this.addMonths(baseDate, 12);
            default:
                return baseDateString;
        }
    },

    /**
     * Determines if a schedule is due on a specific date.
     */
    isDueOnDate(schedule: IRecurringSchedule, targetDate: ISODateString): boolean {
        if (!schedule.isActive) return false;
        // Ensure frequency is supported
        if (!Object.values(Frequency).includes(schedule.frequency as Frequency)) return false;
        if (targetDate < schedule.startDate) return false;
        if (schedule.endDate && targetDate > schedule.endDate) return false;

        // For simple implementations, we check if targetDate is reachable from startDate via frequency
        // In a real system, we'd iterate or use more complex modulus math across month boundaries
        let checkDate = schedule.startDate;
        while (checkDate <= targetDate) {
            if (checkDate === targetDate) return true;
            const next = this.calculateNextDueDate(
                schedule.startDate,
                schedule.frequency,
                checkDate,
            );
            if (next === checkDate) break; // Prevent infinite loop
            checkDate = next;
        }

        return false;
    },

    /**
     * Calculates how many occurrences are between nextDueDate and today.
     */
    getOverdueCount(schedule: IRecurringSchedule, today: ISODateString): number {
        if (!schedule.isActive || schedule.nextDueDate > today) return 0;

        let count = 0;
        let checkDate = schedule.nextDueDate;

        while (checkDate <= today) {
            count++;
            const next = this.calculateNextDueDate(
                schedule.startDate,
                schedule.frequency,
                checkDate,
            );
            if (next <= checkDate) break;
            checkDate = next;

            // Safety break to prevent infinite loops in tests
            if (count > 1000) break;
        }

        return count;
    },

    addDays(date: Date, days: number): ISODateString {
        const result = new Date(date);
        result.setUTCDate(result.getUTCDate() + days);
        return result.toISOString().split('T')[0] as ISODateString;
    },

    addMonths(date: Date, months: number): ISODateString {
        const result = new Date(date);
        const dayOfMonth = result.getUTCDate();
        result.setUTCMonth(result.getUTCMonth() + months);

        // Handle month-end issues (e.g., Jan 31 -> Feb 28)
        if (result.getUTCDate() !== dayOfMonth) {
            result.setUTCDate(0);
        }
        return result.toISOString().split('T')[0] as ISODateString;
    },

    calculateNextSemiMonthly(date: Date): ISODateString {
        const day = date.getUTCDate();
        const result = new Date(date);

        if (day < 15) {
            // If before 15th, next is 15th
            result.setUTCDate(15);
        } else {
            // If 15th or later, next is 1st of next month
            result.setUTCMonth(result.getUTCMonth() + 1);
            result.setUTCDate(1);
        }

        return result.toISOString().split('T')[0] as ISODateString;
    },
};
