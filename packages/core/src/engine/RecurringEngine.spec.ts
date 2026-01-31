import { describe, it, expect } from 'vitest';
import { RecurringEngine } from './RecurringEngine';
import { Frequency, PaymentMethod, ScheduleType, type IRecurringSchedule } from '../domain/types';

describe('RecurringEngine', () => {
    describe('calculateNextDueDate', () => {
        it('should calculate weekly correctly', () => {
            expect(RecurringEngine.calculateNextDueDate('2026-01-01', Frequency.Weekly)).toBe(
                '2026-01-08',
            );
        });

        it('should calculate monthly correctly across month boundaries', () => {
            expect(RecurringEngine.calculateNextDueDate('2026-01-15', Frequency.Monthly)).toBe(
                '2026-02-15',
            );
            expect(RecurringEngine.calculateNextDueDate('2026-01-31', Frequency.Monthly)).toBe(
                '2026-02-28',
            );
        });

        it('should calculate biweekly correctly', () => {
            expect(RecurringEngine.calculateNextDueDate('2026-01-01', Frequency.Biweekly)).toBe(
                '2026-01-15',
            );
        });

        it('should calculate every 4 weeks correctly', () => {
            expect(
                RecurringEngine.calculateNextDueDate('2026-01-01', Frequency.EveryFourWeeks),
            ).toBe('2026-01-29');
        });

        it('should calculate twice a month correctly', () => {
            expect(RecurringEngine.calculateNextDueDate('2026-01-01', Frequency.TwiceAMonth)).toBe(
                '2026-01-15',
            );
            expect(RecurringEngine.calculateNextDueDate('2026-01-15', Frequency.TwiceAMonth)).toBe(
                '2026-02-01',
            );
            expect(RecurringEngine.calculateNextDueDate('2026-01-20', Frequency.TwiceAMonth)).toBe(
                '2026-02-01',
            );
        });

        it('should calculate yearly correctly', () => {
            expect(RecurringEngine.calculateNextDueDate('2026-02-28', Frequency.Yearly)).toBe(
                '2027-02-28',
            );
        });
    });

    describe('getOverdueCount', () => {
        const mockSchedule: IRecurringSchedule = {
            id: '1',
            accountId: 'acc1',
            payee: 'Test',
            amount: 100,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.DirectDebit,
            startDate: '2026-01-01',
            endDate: null,
            nextDueDate: '2026-02-01',
            lastOccurredDate: '2026-01-01',
            splits: [{ id: 's1', categoryId: 'cat1', amount: 100, memo: '' }],
            memo: '',
            autoPost: false,
            isActive: true,
        };

        it('should return 0 if not due yet', () => {
            expect(RecurringEngine.getOverdueCount(mockSchedule, '2026-01-15')).toBe(0);
        });

        it('should return 1 if exactly on due date', () => {
            expect(RecurringEngine.getOverdueCount(mockSchedule, '2026-02-01')).toBe(1);
        });

        it('should return 2 if one occurrence skipped', () => {
            expect(RecurringEngine.getOverdueCount(mockSchedule, '2026-03-01')).toBe(2);
        });

        it('should return many for weekly overdue', () => {
            const weeklySchedule = {
                ...mockSchedule,
                frequency: Frequency.Weekly,
                nextDueDate: '2026-01-01',
            };
            expect(RecurringEngine.getOverdueCount(weeklySchedule, '2026-01-22')).toBe(4);
        });
    });

    describe('isDueOnDate', () => {
        const mockSchedule: IRecurringSchedule = {
            id: '1',
            accountId: 'acc1',
            payee: 'Test',
            amount: 100,
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.DirectDebit,
            startDate: '2026-01-15',
            endDate: null,
            nextDueDate: '2026-02-15',
            lastOccurredDate: '2026-01-15',
            splits: [{ id: 's1', categoryId: 'cat1', amount: 100, memo: '' }],
            memo: '',
            autoPost: false,
            isActive: true,
        };

        it('should correctly identify monthly due dates', () => {
            expect(RecurringEngine.isDueOnDate(mockSchedule, '2026-01-15')).toBe(true);
            expect(RecurringEngine.isDueOnDate(mockSchedule, '2026-02-15')).toBe(true);
            expect(RecurringEngine.isDueOnDate(mockSchedule, '2026-03-15')).toBe(true);
            expect(RecurringEngine.isDueOnDate(mockSchedule, '2026-01-16')).toBe(false);
        });

        it('should handle end dates', () => {
            const finiteSchedule = { ...mockSchedule, endDate: '2026-02-28' };
            expect(RecurringEngine.isDueOnDate(finiteSchedule, '2026-02-15')).toBe(true);
            expect(RecurringEngine.isDueOnDate(finiteSchedule, '2026-03-15')).toBe(false);
        });
    });
});
