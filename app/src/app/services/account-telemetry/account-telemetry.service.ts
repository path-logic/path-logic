import { Injectable } from '@angular/core';
import {
    AccountType,
    type Cents,
    generateProjection,
    type IAccount,
    type IRecurringSchedule,
    type ISODateString,
    type ITransaction,
    Money,
    TransactionStatus
} from '@core';

/**
 * Supported rolling time windows (in days) for account card telemetry.
 */
export enum TelemetryWindowDays {
    ThirtyDays = 30,
    NinetyDays = 90,
    OneEightyDays = 180
}

/**
 * Financial semantic classification for rendering account telemetry charts.
 */
export enum TelemetrySemanticMode {
    Asset = 'asset',
    RevolvingCredit = 'revolving_credit',
    InstallmentLoan = 'installment_loan',
    ZeroFlat = 'zero_flat'
}

export interface IAccountTelemetryPoint {
    date: ISODateString;
    /** Raw ledger closing balance in cents on this date. */
    balance: Cents;
    /** Positive-magnitude display value (e.g. balance due for liabilities, cash balance for assets). */
    displayValue: Cents;
    /** Net change in cents from transactions posted on this date. */
    netChange: Cents;
    /** Number of transactions posted on this date. */
    txCount: number;
}

export interface IAccountProjectedPoint {
    date: ISODateString;
    balance: Cents;
    displayValue: Cents;
    delta: Cents;
    scheduledCount: number;
    descriptions: Array<string>;
}

export interface IAccountTelemetryOptions {
    windowDays?: TelemetryWindowDays;
    forecastDays?: number;
    referenceDate?: ISODateString;
}

export interface IAccountTelemetrySeries {
    accountId: string;
    semanticMode: TelemetrySemanticMode;
    windowDays: TelemetryWindowDays;
    anchorDate: ISODateString;
    isHistoricalWindow: boolean;
    isZeroFlat: boolean;
    points: Array<IAccountTelemetryPoint>;
    projectedPoints: Array<IAccountProjectedPoint>;
    startBalance: Cents;
    endBalance: Cents;
    highBalance: Cents;
    lowBalance: Cents;
    startDisplayValue: Cents;
    endDisplayValue: Cents;
    highDisplayValue: Cents;
    lowDisplayValue: Cents;
    /** Net change in display value across the window (positive = cash up OR balance due up). */
    netDeltaCents: Cents;
    percentDelta: number | null;
    /** True when the trajectory moved in a financially healthy direction (cash up, or debt owed down/steady). */
    isFavorableDelta: boolean;
    formattedNetDelta: string;
    formattedPercentDelta: string | null;
    formattedHighDisplay: string;
    formattedLowDisplay: string;
    compactTrendBadge: string | null;
    creditLimitCents: Cents | null;
    creditUtilizationRatio: number | null;
}

export interface ISteppedSvgGeometryOptions {
    values: ReadonlyArray<number>;
    forecastValues?: ReadonlyArray<number>;
    ceilingValue?: number | null;
    width?: number;
    height?: number;
    paddingTop?: number;
    paddingBottom?: number;
    isFlatZero?: boolean;
}

export interface ISteppedSvgGeometry {
    strokePath: string;
    areaPath: string;
    forecastPath: string | null;
    ceilingY: number | null;
    splitX: number | null;
    endDotX: number;
    endDotY: number;
}

/**
 * Pure deterministic SVG geometry builder for stepped financial balance curves.
 * Uses horizontal-then-vertical (`H x V y`) segments so daily closing balances
 * never exhibit artificial Bezier overshoot between posting dates.
 */
export function buildSteppedSvgGeometry(options: ISteppedSvgGeometryOptions): ISteppedSvgGeometry {
    const width = options.width ?? 100;
    const height = options.height ?? 45;
    const padTop = options.paddingTop ?? 6;
    const padBottom = options.paddingBottom ?? 6;
    const midY = Number((height / 2).toFixed(1));
    const bottomY = Number((height - padBottom).toFixed(1));

    const historyVals = options.values;
    const forecastVals = options.forecastValues ?? [];

    if (options.isFlatZero || historyVals.length === 0) {
        const flatStroke = `M 0 ${midY} H ${width}`;
        return {
            strokePath: flatStroke,
            areaPath: '',
            forecastPath: null,
            ceilingY: null,
            splitX: null,
            endDotX: width,
            endDotY: midY
        };
    }

    const combinedVals: Array<number> = [...historyVals, ...forecastVals];
    if (options.ceilingValue !== undefined && options.ceilingValue !== null) {
        combinedVals.push(options.ceilingValue);
    }

    const minVal = Math.min(...combinedVals);
    const maxVal = Math.max(...combinedVals);
    const range = maxVal - minVal;
    const plotHeight = Math.max(4, height - padTop - padBottom);

    const totalCount = historyVals.length + forecastVals.length;
    const denom = Math.max(1, totalCount - 1);

    const toX = (index: number): number => Number(((index / denom) * width).toFixed(1));
    const toY = (val: number): number => {
        if (range === 0) return midY;
        const normalized = (val - minVal) / range;
        return Number((height - padBottom - normalized * plotHeight).toFixed(1));
    };

    const historyCoords = historyVals.map((v, idx) => ({
        x: toX(idx),
        y: toY(v)
    }));

    const first = historyCoords[0] ?? { x: 0, y: midY };
    const lastHistory = historyCoords[historyCoords.length - 1] ?? first;

    let strokeSegments = `M ${first.x} ${first.y}`;
    for (let i = 1; i < historyCoords.length; i++) {
        const pt = historyCoords[i];
        if (!pt) continue;
        strokeSegments += ` H ${pt.x} V ${pt.y}`;
    }
    if (historyCoords.length === 1 && forecastVals.length === 0) {
        strokeSegments += ` H ${width}`;
    }

    const areaPath =
        range === 0 && minVal === 0
            ? ''
            : `${strokeSegments} L ${lastHistory.x} ${bottomY} L ${first.x} ${bottomY} Z`;

    let forecastPath: string | null = null;
    let splitX: number | null = null;
    if (forecastVals.length > 0) {
        splitX = lastHistory.x;
        let fPath = `M ${lastHistory.x} ${lastHistory.y}`;
        for (let j = 0; j < forecastVals.length; j++) {
            const val = forecastVals[j];
            if (val === undefined) continue;
            const fx = toX(historyVals.length + j);
            const fy = toY(val);
            fPath += ` H ${fx} V ${fy}`;
        }
        forecastPath = fPath;
    }

    const ceilingY =
        options.ceilingValue !== undefined && options.ceilingValue !== null
            ? toY(options.ceilingValue)
            : null;

    return {
        strokePath: strokeSegments,
        areaPath,
        forecastPath,
        ceilingY,
        splitX,
        endDotX: lastHistory.x,
        endDotY: lastHistory.y
    };
}

/**
 * Domain-aligned financial telemetry service for computing real daily running balances,
 * account-type-specific trajectories, credit utilization ceilings, and scheduled forward tails.
 */
@Injectable({ providedIn: 'root' })
export class AccountTelemetryService {
    /**
     * Returns the default rolling window for an account based on its financial class.
     * Installment loans use 180 days so monthly principal amortization steps are visible.
     */
    getDefaultWindowForAccount(account: IAccount): TelemetryWindowDays {
        if (this.isInstallmentLoan(account.type)) {
            return TelemetryWindowDays.OneEightyDays;
        }
        return TelemetryWindowDays.ThirtyDays;
    }

    isInstallmentLoan(type: AccountType): boolean {
        return (
            type === AccountType.Mortgage ||
            type === AccountType.AutoLoan ||
            type === AccountType.PersonalLoan
        );
    }

    isLiabilityAccount(type: AccountType): boolean {
        return type === AccountType.Credit || this.isInstallmentLoan(type);
    }

    /**
     * Reconstructs exact daily closing balances in integer cents and builds semantic chart series.
     */
    buildAccountTelemetry(
        account: IAccount,
        transactions: ReadonlyArray<ITransaction>,
        schedules: ReadonlyArray<IRecurringSchedule> = [],
        options: IAccountTelemetryOptions = {}
    ): IAccountTelemetrySeries {
        const windowDays = options.windowDays ?? this.getDefaultWindowForAccount(account);
        const forecastDays = Math.max(0, options.forecastDays ?? 0);
        const todayIso = this.toIsoDate(new Date());

        const acctTxs = transactions.filter((tx): boolean => tx.accountId === account.id);
        let latestTxDate: ISODateString | null = null;
        for (const tx of acctTxs) {
            const norm = this.normalizeIsoDate(tx.date);
            if (norm && (latestTxDate === null || norm > latestTxDate)) {
                latestTxDate = norm;
            }
        }

        let anchorDate: ISODateString = options.referenceDate ?? todayIso;
        let isHistoricalWindow = false;

        if (!options.referenceDate && latestTxDate !== null) {
            const earliestRecentDate = this.addDaysIso(todayIso, -(windowDays - 1));
            if (latestTxDate > todayIso) {
                anchorDate = latestTxDate;
            } else if (latestTxDate < earliestRecentDate) {
                anchorDate = latestTxDate;
                isHistoricalWindow = true;
            }
        }

        const dailyMap = new Map<ISODateString, { netChange: Cents; txCount: number }>();
        let postAnchorDelta: Cents = 0;

        for (const tx of acctTxs) {
            const normDate = this.normalizeIsoDate(tx.date);
            if (!normDate) continue;
            if (normDate > anchorDate) {
                postAnchorDelta += tx.totalAmount;
                continue;
            }
            const existing = dailyMap.get(normDate);
            if (existing) {
                existing.netChange += tx.totalAmount;
                existing.txCount += 1;
            } else {
                dailyMap.set(normDate, {
                    netChange: tx.totalAmount,
                    txCount: 1
                });
            }
        }

        const currentWorkingBalance: Cents = account.pendingBalance ?? account.clearedBalance;
        const anchorClosingBalance: Cents = currentWorkingBalance - postAnchorDelta;

        const rawPoints = new Array<{
            date: ISODateString;
            balance: Cents;
            netChange: Cents;
            txCount: number;
        }>(windowDays);

        let runningCursor: Cents = anchorClosingBalance;
        for (let idx = windowDays - 1; idx >= 0; idx--) {
            const offsetFromAnchor = idx - (windowDays - 1);
            const dateStr = this.addDaysIso(anchorDate, offsetFromAnchor);
            const dayBucket = dailyMap.get(dateStr);
            const netChange = dayBucket?.netChange ?? 0;
            const txCount = dayBucket?.txCount ?? 0;

            rawPoints[idx] = {
                date: dateStr,
                balance: runningCursor,
                netChange,
                txCount
            };

            runningCursor -= netChange;
        }

        const isLiability = this.isLiabilityAccount(account.type);
        const usesNegativeLiabilitySign =
            isLiability &&
            (anchorClosingBalance < 0 || rawPoints.some(pt => (pt?.balance ?? 0) < 0));

        const toDisplayValue = (rawBalance: Cents): Cents => {
            if (!isLiability) {
                return rawBalance;
            }
            return usesNegativeLiabilitySign ? -rawBalance : rawBalance;
        };

        const points: Array<IAccountTelemetryPoint> = rawPoints.map(pt => ({
            date: pt.date,
            balance: pt.balance,
            displayValue: toDisplayValue(pt.balance),
            netChange: pt.netChange,
            txCount: pt.txCount
        }));

        const allZeroPoints = points.every(p => p.balance === 0);
        const isZeroAccountNow = account.clearedBalance === 0 && account.pendingBalance === 0;
        const isZeroFlat = isZeroAccountNow && allZeroPoints;

        const semanticMode = this.resolveSemanticMode(account.type, isZeroFlat);

        const startPoint = points[0];
        const endPoint = points[points.length - 1];
        const startBalance = startPoint?.balance ?? anchorClosingBalance;
        const endBalance = endPoint?.balance ?? anchorClosingBalance;
        const startDisplayValue = startPoint?.displayValue ?? toDisplayValue(anchorClosingBalance);
        const endDisplayValue = endPoint?.displayValue ?? toDisplayValue(anchorClosingBalance);

        const balances = points.map(p => p.balance);
        const displayValues = points.map(p => p.displayValue);
        const highBalance = balances.length > 0 ? Math.max(...balances) : anchorClosingBalance;
        const lowBalance = balances.length > 0 ? Math.min(...balances) : anchorClosingBalance;
        const highDisplayValue =
            displayValues.length > 0 ? Math.max(...displayValues) : endDisplayValue;
        const lowDisplayValue =
            displayValues.length > 0 ? Math.min(...displayValues) : endDisplayValue;

        const netDeltaCents: Cents = endDisplayValue - startDisplayValue;
        const isFavorableDelta = isLiability ? netDeltaCents <= 0 : netDeltaCents >= 0;

        let percentDelta: number | null = null;
        if (!isZeroFlat && netDeltaCents !== 0 && Math.abs(startDisplayValue) > 0) {
            const rawPct = (netDeltaCents / Math.abs(startDisplayValue)) * 100;
            percentDelta = Math.max(-999.9, Math.min(999.9, rawPct));
        }

        const formattedNetDelta = this.formatSignedCurrency(netDeltaCents);
        const formattedPercentDelta =
            percentDelta !== null
                ? `${percentDelta >= 0 ? '+' : ''}${percentDelta.toFixed(1)}%`
                : null;

        let compactTrendBadge: string | null = null;
        if (!isZeroFlat && netDeltaCents !== 0) {
            compactTrendBadge = formattedPercentDelta ?? formattedNetDelta;
        }

        let creditLimitCents: Cents | null = null;
        let creditUtilizationRatio: number | null = null;
        if (
            account.type === AccountType.Credit &&
            account.creditCardDetails?.creditLimit &&
            account.creditCardDetails.creditLimit > 0
        ) {
            creditLimitCents = account.creditCardDetails.creditLimit;
            creditUtilizationRatio = Math.max(0, endDisplayValue) / creditLimitCents;
        }

        const projectedPoints: Array<IAccountProjectedPoint> = [];
        if (forecastDays > 0 && account.isActive !== false) {
            const forecastStart = this.addDaysIso(anchorDate, 1);
            const futurePending = acctTxs.filter(
                tx =>
                    tx.status === TransactionStatus.Pending &&
                    this.normalizeIsoDate(tx.date) >= forecastStart
            );
            const activeAccountSchedules = schedules.filter(
                s => s.accountId === account.id && s.isActive !== false
            );

            const forecastRaw = generateProjection(forecastStart, forecastDays, {
                clearedBalance: anchorClosingBalance,
                pendingTransactions: futurePending,
                recurringSchedules: activeAccountSchedules
            });

            for (const fp of forecastRaw) {
                projectedPoints.push({
                    date: fp.date,
                    balance: fp.projectedBalance,
                    displayValue: toDisplayValue(fp.projectedBalance),
                    delta: fp.delta,
                    scheduledCount: fp.items.length,
                    descriptions: fp.items.map(item => item.description)
                });
            }
        }

        return {
            accountId: account.id,
            semanticMode,
            windowDays,
            anchorDate,
            isHistoricalWindow,
            isZeroFlat,
            points,
            projectedPoints,
            startBalance,
            endBalance,
            highBalance,
            lowBalance,
            startDisplayValue,
            endDisplayValue,
            highDisplayValue,
            lowDisplayValue,
            netDeltaCents,
            percentDelta,
            isFavorableDelta,
            formattedNetDelta,
            formattedPercentDelta,
            formattedHighDisplay: Money.formatCurrency(highDisplayValue),
            formattedLowDisplay: Money.formatCurrency(lowDisplayValue),
            compactTrendBadge,
            creditLimitCents,
            creditUtilizationRatio
        };
    }

    private resolveSemanticMode(type: AccountType, isZeroFlat: boolean): TelemetrySemanticMode {
        if (isZeroFlat) {
            return TelemetrySemanticMode.ZeroFlat;
        }
        if (type === AccountType.Credit) {
            return TelemetrySemanticMode.RevolvingCredit;
        }
        if (this.isInstallmentLoan(type)) {
            return TelemetrySemanticMode.InstallmentLoan;
        }
        return TelemetrySemanticMode.Asset;
    }

    private formatSignedCurrency(cents: Cents): string {
        if (cents === 0) {
            return '$0.00';
        }
        const absFormatted = Money.formatCurrency(Math.abs(cents));
        return cents > 0 ? `+${absFormatted}` : `-${absFormatted}`;
    }

    private normalizeIsoDate(dateStr: string): ISODateString {
        return dateStr.slice(0, 10);
    }

    private toIsoDate(date: Date): ISODateString {
        return date.toISOString().split('T')[0] ?? '';
    }

    private addDaysIso(isoDate: ISODateString, deltaDays: number): ISODateString {
        const d = new Date(`${isoDate}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + deltaDays);
        return d.toISOString().split('T')[0] ?? isoDate;
    }
}
