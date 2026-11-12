import { TestBed } from '@angular/core/testing';
import {
    AccountType,
    Frequency,
    type IAccount,
    type IRecurringSchedule,
    type ITransaction,
    PaymentMethod,
    ScheduleType,
    TransactionStatus
} from '@core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
    AccountTelemetryService,
    buildSteppedSvgGeometry,
    TelemetrySemanticMode,
    TelemetryWindowDays
} from './account-telemetry.service';

describe('AccountTelemetryService', () => {
    let service: AccountTelemetryService;

    const baseChecking: IAccount = {
        id: 'acc-chk',
        name: 'Primary Checking',
        institutionName: 'Chase',
        type: AccountType.Checking,
        clearedBalance: 300000,
        pendingBalance: 300000,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-11-10',
        deletedAt: null
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AccountTelemetryService]
        });
        service = TestBed.inject(AccountTelemetryService);
    });

    it('reconstructs exact daily closing balances backwards from pendingBalance in integer cents', () => {
        const txs: Array<ITransaction> = [
            {
                id: 'tx-1',
                accountId: 'acc-chk',
                payeeId: 'p-1',
                date: '2026-11-08',
                payee: 'Employer Payroll',
                memo: '',
                totalAmount: 250000, // +$2,500.00
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'h1',
                createdAt: '2026-11-08',
                updatedAt: '2026-11-08'
            },
            {
                id: 'tx-2',
                accountId: 'acc-chk',
                payeeId: 'p-2',
                date: '2026-11-10',
                payee: 'Mortgage Servicer',
                memo: '',
                totalAmount: -150000, // -$1,500.00
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'h2',
                createdAt: '2026-11-10',
                updatedAt: '2026-11-10'
            }
        ];

        const series = service.buildAccountTelemetry(baseChecking, txs, [], {
            windowDays: TelemetryWindowDays.ThirtyDays,
            referenceDate: '2026-11-10'
        });

        expect(series.semanticMode).toBe(TelemetrySemanticMode.Asset);
        expect(series.windowDays).toBe(TelemetryWindowDays.ThirtyDays);
        expect(series.points.length).toBe(30);

        // Start balance prior to Nov 8: 300000 - (250000 - 150000) = 200000 ($2,000.00)
        expect(series.startBalance).toBe(200000);
        expect(series.endBalance).toBe(300000);

        // Nov 8 peak after payroll: 200000 + 250000 = 450000 ($4,500.00)
        const nov8 = series.points.find(p => p.date === '2026-11-08');
        expect(nov8?.balance).toBe(450000);
        expect(nov8?.netChange).toBe(250000);
        expect(nov8?.txCount).toBe(1);

        // Nov 9 stays stepped at 450000
        const nov9 = series.points.find(p => p.date === '2026-11-09');
        expect(nov9?.balance).toBe(450000);

        // Nov 10 drops by 150000 to 300000
        const nov10 = series.points.find(p => p.date === '2026-11-10');
        expect(nov10?.balance).toBe(300000);

        expect(series.highBalance).toBe(450000);
        expect(series.lowBalance).toBe(200000);
        expect(series.netDeltaCents).toBe(100000); // +$1,000.00
        expect(series.formattedNetDelta).toBe('+$1,000.00');
        expect(series.formattedPercentDelta).toBe('+50.0%');
        expect(series.isFavorableDelta).toBe(true);
        expect(series.isZeroFlat).toBe(false);
    });

    it('marks $0.00 inactive-balance accounts with no activity as ZeroFlat with null trend badge', () => {
        const zeroAccount: IAccount = {
            ...baseChecking,
            id: 'acc-zero',
            name: '2001 Cobra',
            type: AccountType.AutoLoan,
            clearedBalance: 0,
            pendingBalance: 0
        };

        const series = service.buildAccountTelemetry(zeroAccount, [], [], {
            referenceDate: '2026-11-10'
        });

        expect(series.semanticMode).toBe(TelemetrySemanticMode.ZeroFlat);
        expect(series.isZeroFlat).toBe(true);
        expect(series.formattedPercentDelta).toBeNull();
        expect(series.compactTrendBadge).toBeNull();
    });

    it('computes credit card utilization ratio and treats balance-due increases as unfavorable', () => {
        const creditAccount: IAccount = {
            id: 'acc-cc',
            name: 'Sapphire Reserve',
            institutionName: 'Chase',
            type: AccountType.Credit,
            clearedBalance: -250000, // -$2,500.00 owed
            pendingBalance: -250000,
            isActive: true,
            creditCardDetails: {
                creditLimit: 1000000, // $10,000.00 limit -> 25% utilization
                interestRate: 0.2199,
                promotionalRates: []
            },
            createdAt: '2026-01-01',
            updatedAt: '2026-11-10',
            deletedAt: null
        };

        const txs: Array<ITransaction> = [
            {
                id: 'tx-cc-1',
                accountId: 'acc-cc',
                payeeId: 'p-air',
                date: '2026-11-05',
                payee: 'United Airlines',
                memo: '',
                totalAmount: -50000, // Spent $500 -> owed rose from $2,000 to $2,500
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'hcc1',
                createdAt: '2026-11-05',
                updatedAt: '2026-11-05'
            }
        ];

        const series = service.buildAccountTelemetry(creditAccount, txs, [], {
            referenceDate: '2026-11-10'
        });

        expect(series.semanticMode).toBe(TelemetrySemanticMode.RevolvingCredit);
        expect(series.creditLimitCents).toBe(1000000);
        expect(series.creditUtilizationRatio).toBeCloseTo(0.25, 4);
        // Balance due went from $2,000.00 to $2,500.00 (+$500.00 owed -> unfavorable)
        expect(series.startDisplayValue).toBe(200000);
        expect(series.endDisplayValue).toBe(250000);
        expect(series.isFavorableDelta).toBe(false);
        expect(series.formattedNetDelta).toBe('+$500.00');
    });

    it('defaults installment loans to a 180-day amortization paydown window and marks principal reduction as favorable', () => {
        const mortgageAccount: IAccount = {
            id: 'acc-mtg',
            name: 'Primary Residence Mortgage',
            institutionName: 'Wells Fargo',
            type: AccountType.Mortgage,
            clearedBalance: -21000000, // $210,000.00 principal remaining
            pendingBalance: -21000000,
            isActive: true,
            createdAt: '2020-01-01',
            updatedAt: '2026-11-10',
            deletedAt: null
        };

        const txs: Array<ITransaction> = [
            {
                id: 'tx-m1',
                accountId: 'acc-mtg',
                payeeId: 'p-wf',
                date: '2026-09-01',
                payee: 'Monthly Principal Payment',
                memo: '',
                totalAmount: 120000, // Paid $1,200 principal
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'hm1',
                createdAt: '2026-09-01',
                updatedAt: '2026-09-01'
            },
            {
                id: 'tx-m2',
                accountId: 'acc-mtg',
                payeeId: 'p-wf',
                date: '2026-10-01',
                payee: 'Monthly Principal Payment',
                memo: '',
                totalAmount: 120500, // Paid $1,205 principal
                status: TransactionStatus.Cleared,
                splits: [],
                checkNumber: null,
                importHash: 'hm2',
                createdAt: '2026-10-01',
                updatedAt: '2026-10-01'
            }
        ];

        const series = service.buildAccountTelemetry(mortgageAccount, txs, [], {
            referenceDate: '2026-11-10'
        });

        expect(series.semanticMode).toBe(TelemetrySemanticMode.InstallmentLoan);
        expect(series.windowDays).toBe(TelemetryWindowDays.OneEightyDays);
        expect(series.points.length).toBe(180);
        // Principal owed dropped from $212,405.00 to $210,000.00 (-$2,405.00 owed -> favorable!)
        expect(series.startDisplayValue).toBe(21240500);
        expect(series.endDisplayValue).toBe(21000000);
        expect(series.isFavorableDelta).toBe(true);
        expect(series.formattedNetDelta).toBe('-$2,405.00');
    });

    it('anchors historical MS Money imported accounts to their latest transaction date when inactive recently', () => {
        const historicalAccount: IAccount = {
            ...baseChecking,
            id: 'acc-hist',
            clearedBalance: 420000,
            pendingBalance: 420000
        };
        const historicalTxs: Array<ITransaction> = [
            {
                id: 'tx-h1',
                accountId: 'acc-hist',
                payeeId: 'p-1',
                date: '2024-05-10',
                payee: 'Bonus Deposit',
                memo: '',
                totalAmount: 120000,
                status: TransactionStatus.Reconciled,
                splits: [],
                checkNumber: null,
                importHash: 'hh1',
                createdAt: '2024-05-10',
                updatedAt: '2024-05-10'
            }
        ];

        // Without explicit referenceDate, smart anchor snaps to 2024-05-10 so trajectory isn't flat
        const series = service.buildAccountTelemetry(historicalAccount, historicalTxs, []);
        expect(series.isHistoricalWindow).toBe(true);
        expect(series.anchorDate).toBe('2024-05-10');
        expect(series.startBalance).toBe(300000);
        expect(series.endBalance).toBe(420000);
    });

    it('projects forward scheduled cashflows when forecastDays > 0', () => {
        const schedules: Array<IRecurringSchedule> = [
            {
                id: 'sch-1',
                accountId: 'acc-chk',
                payee: 'Electric Utility',
                amount: -18000,
                type: ScheduleType.Debit,
                frequency: Frequency.Monthly,
                paymentMethod: PaymentMethod.DirectDebit,
                startDate: '2026-10-15',
                endDate: null,
                nextDueDate: '2026-11-15',
                lastOccurredDate: '2026-10-15',
                splits: [],
                memo: '',
                autoPost: false,
                isActive: true
            }
        ];

        const series = service.buildAccountTelemetry(baseChecking, [], schedules, {
            windowDays: TelemetryWindowDays.ThirtyDays,
            forecastDays: 14,
            referenceDate: '2026-11-10'
        });

        expect(series.projectedPoints.length).toBe(14);
        const nov15 = series.projectedPoints.find(p => p.date === '2026-11-15');
        expect(nov15).toBeTruthy();
        expect(nov15?.scheduledCount).toBe(1);
        expect(nov15?.balance).toBe(282000); // $3,000 - $180 = $2,820
    });

    it('builds crisp stepped SVG stroke, closed area, ceiling, and forecast geometry', () => {
        const geometry = buildSteppedSvgGeometry({
            values: [1000, 1500, 1200],
            forecastValues: [1100, 900],
            ceilingValue: 2000,
            width: 100,
            height: 45,
            paddingTop: 6,
            paddingBottom: 6
        });

        // Stepped path uses horizontal ('H') and vertical ('V') commands
        expect(geometry.strokePath).toContain('M 0');
        expect(geometry.strokePath).toContain('H ');
        expect(geometry.strokePath).toContain('V ');
        expect(geometry.areaPath).toContain('Z');
        expect(geometry.forecastPath).toBeTruthy();
        expect(geometry.ceilingY).not.toBeNull();
        expect(geometry.splitX).not.toBeNull();
    });
});
