import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { IAccount } from '@core';
import { AccountType, Money } from '@core';
import { UIChart } from 'primeng/chart';

import {
    buildSteppedSvgGeometry,
    type IAccountTelemetrySeries,
    type ISteppedSvgGeometry,
    TelemetrySemanticMode,
    TelemetryWindowDays
} from '../../../services/account-telemetry/account-telemetry.service';

/**
 * High-density account card with real ledger telemetry:
 * - Full-width Hero card renders an interactive Chart.js stepped area chart (`UIChart`)
 *   with 30d/90d window toggle, High/Low/Net Delta callouts, and 14d scheduled markers.
 * - Sub-grid cards render zero-overhead stepped SVG area micro-charts with credit limit
 *   ceilings, 180d loan amortization slopes, and muted $0.00 zero-balance baselines.
 */
@Component({
    selector: 'account-sparkline-card',
    standalone: true,
    imports: [RouterLink, UIChart],
    templateUrl: './account-sparkline-card.component.html',
    styleUrl: './account-sparkline-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountSparklineCardComponent {
    readonly TelemetryWindowDays = TelemetryWindowDays;

    readonly account = input.required<IAccount>();
    readonly telemetry = input<IAccountTelemetrySeries | null>(null);
    readonly heroTelemetry90d = input<IAccountTelemetrySeries | null>(null);
    readonly trendPercent = input<string | null>(null);
    readonly balanceHistory = input<Array<number>>([]);
    readonly isFullWidth = input<boolean>(false);
    readonly isPrimary = input<boolean>(false);

    readonly quickEntryRequested = output<string>();
    readonly starToggled = output<string>();
    readonly windowChanged = output<TelemetryWindowDays>();

    private readonly selectedHeroWindow = signal<TelemetryWindowDays | null>(null);

    readonly activeHeroWindow = computed((): TelemetryWindowDays => {
        const explicit = this.selectedHeroWindow();
        if (explicit !== null) {
            return explicit;
        }
        return this.telemetry()?.windowDays ?? TelemetryWindowDays.ThirtyDays;
    });

    readonly canToggleHeroWindow = computed((): boolean => {
        return this.telemetry() !== null && this.heroTelemetry90d() !== null;
    });

    readonly activeTelemetry = computed((): IAccountTelemetrySeries | null => {
        if (
            this.isFullWidth() &&
            this.activeHeroWindow() === TelemetryWindowDays.NinetyDays &&
            this.heroTelemetry90d() !== null
        ) {
            return this.heroTelemetry90d();
        }
        return this.telemetry();
    });

    readonly isZeroBalance = computed((): boolean => {
        return this.account().clearedBalance === 0 && this.account().pendingBalance === 0;
    });

    readonly isZeroFlatChart = computed((): boolean => {
        const series = this.activeTelemetry();
        if (series) {
            return series.isZeroFlat;
        }
        return this.isZeroBalance() && this.balanceHistory().every(v => v === 0);
    });

    readonly formattedBalance = computed((): string => {
        if (this.isCredit()) {
            return Money.formatCurrency(Math.abs(this.account().pendingBalance));
        }
        return Money.formatCurrency(this.account().pendingBalance);
    });

    readonly formattedClearedBalance = computed((): string => {
        if (this.isCredit()) {
            return Money.formatCurrency(Math.abs(this.account().clearedBalance));
        }
        return Money.formatCurrency(this.account().clearedBalance);
    });

    readonly pendingDifference = computed((): number => {
        return this.account().pendingBalance - this.account().clearedBalance;
    });

    readonly hasPendingTransactions = computed((): boolean => {
        return this.pendingDifference() !== 0;
    });

    readonly formattedPendingDifference = computed((): string => {
        const diff = this.pendingDifference();
        const formatted = Money.formatCurrency(Math.abs(diff));
        return diff > 0 ? `+${formatted}` : `-${formatted}`;
    });

    readonly isCredit = computed((): boolean => {
        return this.account().type === AccountType.Credit;
    });

    readonly isInstallmentLoan = computed((): boolean => {
        const t = this.account().type;
        return (
            t === AccountType.Mortgage ||
            t === AccountType.AutoLoan ||
            t === AccountType.PersonalLoan
        );
    });

    readonly isNegative = computed((): boolean => {
        if (this.isCredit()) {
            return Math.abs(this.account().pendingBalance) > 0;
        }
        return this.account().pendingBalance < 0;
    });

    readonly accountIcon = computed((): string => {
        switch (this.account().type) {
            case AccountType.Checking:
                return 'pi-wallet';
            case AccountType.Savings:
                return 'pi-building-columns';
            case AccountType.Credit:
                return 'pi-credit-card';
            case AccountType.Cash:
                return 'pi-money-bill';
            case AccountType.Mortgage:
                return 'pi-home';
            case AccountType.AutoLoan:
                return 'pi-car';
            case AccountType.PersonalLoan:
                return 'pi-percentage';
            default:
                return 'pi-folder';
        }
    });

    readonly typeDisplayName = computed((): string => {
        switch (this.account().type) {
            case AccountType.Checking:
                return 'Checking';
            case AccountType.Savings:
                return 'Savings';
            case AccountType.Credit:
                return 'Credit Card';
            case AccountType.Cash:
                return 'Cash';
            case AccountType.Mortgage:
                return 'Mortgage';
            case AccountType.AutoLoan:
                return 'Auto Loan';
            case AccountType.PersonalLoan:
                return 'Personal Loan';
            default:
                return 'Account';
        }
    });

    /**
     * Effective trend badge text: honors explicit `[trendPercent]` input when provided,
     * otherwise uses real telemetry delta (and returns null for $0.00 / unchanged accounts).
     */
    readonly effectiveTrendBadge = computed((): string | null => {
        const explicit = this.trendPercent();
        if (explicit !== null && explicit !== '') {
            return explicit;
        }
        if (this.isZeroBalance()) {
            return null;
        }
        const series = this.activeTelemetry();
        if (!series || series.isZeroFlat || series.netDeltaCents === 0) {
            return null;
        }
        if (this.isFullWidth()) {
            const windowLabel = `${series.windowDays}d`;
            if (series.formattedPercentDelta) {
                return `${series.formattedNetDelta} (${series.formattedPercentDelta}) ${windowLabel}`;
            }
            return `${series.formattedNetDelta} ${windowLabel}`;
        }
        return series.compactTrendBadge;
    });

    readonly creditUtilizationPercent = computed((): number | null => {
        const ratio = this.activeTelemetry()?.creditUtilizationRatio ?? null;
        if (ratio === null) return null;
        return Math.round(ratio * 100);
    });

    readonly subCardCaption = computed((): string | null => {
        if (this.isZeroFlatChart()) {
            return null;
        }
        const utilPct = this.creditUtilizationPercent();
        if (utilPct !== null) {
            return `${utilPct}% of limit`;
        }
        const series = this.activeTelemetry();
        if (series?.semanticMode === TelemetrySemanticMode.InstallmentLoan) {
            return `${series.windowDays}d principal slope`;
        }
        return null;
    });

    readonly heroTrajectorySubtitle = computed((): string => {
        const series = this.activeTelemetry();
        if (this.isZeroFlatChart()) {
            return 'Zero balance — no recent ledger activity';
        }
        if (!series) {
            return '30-day balance trajectory';
        }
        const scheduledEvents = series.projectedPoints.reduce(
            (sum, p) => sum + p.scheduledCount,
            0
        );
        const tailNote = scheduledEvents > 0 ? ` • +14d scheduled (${scheduledEvents})` : '';
        if (series.isHistoricalWindow) {
            return `${series.windowDays}d historical trajectory (through ${series.anchorDate})${tailNote}`;
        }
        return `${series.windowDays}-day daily closing balance${tailNote}`;
    });

    /**
     * Stepped SVG geometry for sub-grid cards and fallback rendering.
     */
    readonly svgGeometry = computed((): ISteppedSvgGeometry => {
        if (this.isZeroFlatChart()) {
            return buildSteppedSvgGeometry({
                values: [0, 0],
                width: 100,
                height: 45,
                isFlatZero: true
            });
        }

        const series = this.activeTelemetry();
        if (series && series.points.length >= 2) {
            return buildSteppedSvgGeometry({
                values: series.points.map(p => p.displayValue),
                ceilingValue: series.creditLimitCents,
                width: 100,
                height: 45,
                paddingTop: 6,
                paddingBottom: 6
            });
        }

        const history = this.balanceHistory();
        if (history.length >= 2) {
            return buildSteppedSvgGeometry({
                values: history,
                width: 100,
                height: 45,
                paddingTop: 6,
                paddingBottom: 6
            });
        }

        const fallbackVal = Math.abs(this.account().pendingBalance);
        return buildSteppedSvgGeometry({
            values: [fallbackVal, fallbackVal],
            width: 100,
            height: 45,
            paddingTop: 6,
            paddingBottom: 6
        });
    });

    readonly sparklinePath = computed((): string => {
        return this.svgGeometry().strokePath;
    });

    readonly sparklineStrokeColor = computed((): string => {
        if (this.isZeroFlatChart() || this.isZeroBalance()) {
            return '#94a3b8'; // Slate muted baseline
        }
        const series = this.activeTelemetry();
        if (series) {
            if (series.semanticMode === TelemetrySemanticMode.RevolvingCredit) {
                return series.netDeltaCents > 0 ? '#f59e0b' : '#10b981';
            }
            if (series.semanticMode === TelemetrySemanticMode.InstallmentLoan) {
                return series.isFavorableDelta ? '#10b981' : '#f59e0b';
            }
            return series.isFavorableDelta ? '#10b981' : '#ef4444';
        }
        if (this.isCredit()) {
            return '#38bdf8';
        }
        if (this.account().pendingBalance < 0) {
            return '#ef4444';
        }
        return '#10b981';
    });

    readonly chartAriaLabel = computed((): string => {
        const accName = this.account().name;
        if (this.isZeroFlatChart()) {
            return `${accName}: $0.00 zero balance baseline`;
        }
        const series = this.activeTelemetry();
        if (series) {
            return `${series.windowDays}-day balance history for ${accName}: low ${series.formattedLowDisplay}, high ${series.formattedHighDisplay}, net change ${series.formattedNetDelta}`;
        }
        return `Balance sparkline for ${accName}`;
    });

    /**
     * Interactive Chart.js (`UIChart`) dataset for the Full-Width Hero Card.
     */
    readonly shouldUseInteractiveHeroChart = computed((): boolean => {
        return this.isFullWidth() && this.activeTelemetry() !== null && !this.isZeroFlatChart();
    });

    readonly heroChartData = computed(() => {
        const series = this.activeTelemetry();
        if (!series) {
            return { labels: [], datasets: [] };
        }

        const color = this.sparklineStrokeColor();
        const historyLen = series.points.length;
        const hasScheduledTail = series.projectedPoints.some(p => p.scheduledCount > 0);
        const tailPoints = hasScheduledTail ? series.projectedPoints : [];

        const labels: Array<string> = [
            ...series.points.map(p => p.date),
            ...tailPoints.map(p => p.date)
        ];

        const historyData: Array<number | null> = [
            ...series.points.map(p => Money.centsToDollars(p.displayValue)),
            ...tailPoints.map(() => null)
        ];

        const datasets: Array<Record<string, unknown>> = [
            {
                label: this.isCredit() ? 'Balance Due' : 'Closing Balance',
                data: historyData,
                stepped: 'before',
                fill: true,
                borderColor: color,
                backgroundColor: `${color}22`,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4
            }
        ];

        if (tailPoints.length > 0 && historyLen > 0) {
            const lastHistoryVal = Money.centsToDollars(
                series.points[historyLen - 1]?.displayValue ?? 0
            );
            const forecastData: Array<number | null> = [
                ...series.points.map((_, idx) => (idx === historyLen - 1 ? lastHistoryVal : null)),
                ...tailPoints.map(p => Money.centsToDollars(p.displayValue))
            ];
            const pointRadii: Array<number> = [
                ...series.points.map(() => 0),
                ...tailPoints.map(p => (p.scheduledCount > 0 ? 3 : 0))
            ];

            datasets.push({
                label: '14d Scheduled Forecast',
                data: forecastData,
                stepped: 'before',
                fill: false,
                borderColor: '#64748b',
                borderDash: [4, 3],
                borderWidth: 1.75,
                pointRadius: pointRadii,
                pointBackgroundColor: color,
                pointHoverRadius: 4
            });
        }

        if (series.creditLimitCents !== null) {
            const limitDollars = Money.centsToDollars(series.creditLimitCents);
            datasets.push({
                label: 'Credit Limit',
                data: labels.map(() => limitDollars),
                fill: false,
                borderColor: '#94a3b8',
                borderDash: [3, 3],
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0
            });
        }

        return { labels, datasets };
    });

    readonly heroChartOptions = computed(() => {
        const series = this.activeTelemetry();
        return {
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0f172a',
                    titleFont: { size: 10, weight: 'bold' },
                    bodyFont: { size: 10 },
                    padding: 8,
                    callbacks: {
                        label: (context: {
                            datasetIndex: number;
                            dataIndex: number;
                            raw: number | null;
                        }): string => {
                            if (context.raw === null || context.raw === undefined) {
                                return '';
                            }
                            const formattedBal = Money.formatCurrency(
                                Money.dollarsToCents(context.raw)
                            );
                            if (context.datasetIndex === 0 && series) {
                                const pt = series.points[context.dataIndex];
                                if (pt && pt.netChange !== 0) {
                                    const sign = pt.netChange > 0 ? '+' : '-';
                                    const netStr = `${sign}${Money.formatCurrency(Math.abs(pt.netChange))}`;
                                    return ` Balance: ${formattedBal} (${netStr})`;
                                }
                                return ` Balance: ${formattedBal}`;
                            }
                            if (context.datasetIndex === 1) {
                                return ` Forecast: ${formattedBal}`;
                            }
                            return ` Credit Limit: ${formattedBal}`;
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        };
    });

    readonly trendBadgeClass = computed((): string => {
        const explicit = this.trendPercent();
        if (explicit !== null && explicit !== '') {
            if (explicit.startsWith('-')) {
                return 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40';
            }
            return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
        }

        const series = this.activeTelemetry();
        if (series && !series.isFavorableDelta) {
            return 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40';
        }
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
    });

    setHeroWindow(windowDays: TelemetryWindowDays): void {
        this.selectedHeroWindow.set(windowDays);
        this.windowChanged.emit(windowDays);
    }
}
