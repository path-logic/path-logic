import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type IProjectionDataPoint, Money } from '@core';
import { UIChart } from 'primeng/chart';

/**
 * Premium chart-based cashflow projection.
 * Migrated to PrimeNG Chart (Chart.js).
 */
@Component({
    selector: 'projection-chart',
    standalone: true,
    imports: [UIChart],
    templateUrl: './projection-chart.component.html',
    styleUrl: './projection-chart.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectionChartComponent {
    /**
     * 90-day projection data points.
     */
    readonly data = input<Array<IProjectionDataPoint>>(new Array<IProjectionDataPoint>());

    /**
     * Component height in pixels.
     */
    readonly height = input<number>(200);

    /**
     * Additional CSS classes for the container.
     */
    readonly className = input<string>('');

    /**
     * Whether the forecast ends higher than it starts.
     */
    readonly isUp = computed((): boolean => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
        if (dataArr.length < 2) return true;
        const start: number = dataArr[0]?.projectedBalance ?? 0;
        const end: number = dataArr[dataArr.length - 1]?.projectedBalance ?? 0;
        return end >= start;
    });

    /**
     * Data object for Chart.js.
     */
    readonly chartData = computed(() => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
        const labels = dataArr.map(d => d.date);
        const balances = dataArr.map(d => Money.centsToDollars(d.projectedBalance));
        const color = this.isUp() ? '#10b981' : '#ef4444';

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Projected Balance',
                    data: balances,
                    fill: true,
                    borderColor: color,
                    backgroundColor: `${color}20`,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        };
    });

    /**
     * Options object for Chart.js.
     */
    readonly chartOptions = computed(() => {
        return {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#000000',
                    titleFont: { size: 10, weight: 'bold' },
                    bodyFont: { size: 10 },
                    callbacks: {
                        label: (context: { raw: number }): string => {
                            return ` Balance: ${Money.formatCurrency(Money.dollarsToCents(context.raw))}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        };
    });

    /**
     * Formatted final projected balance.
     */
    readonly formattedFinalBalance = computed((): string => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
        if (dataArr.length === 0) return '$0.00';
        const end: number = dataArr[dataArr.length - 1]?.projectedBalance ?? 0;
        return Money.formatCurrency(end);
    });

    /**
     * Formatted delta between start and end.
     */
    readonly formattedDelta = computed((): string => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
        if (dataArr.length < 2) return '$0.00';
        const start: number = dataArr[0]?.projectedBalance ?? 0;
        const end: number = dataArr[dataArr.length - 1]?.projectedBalance ?? 0;
        return Money.formatCurrency(Math.abs(end - start));
    });

    /**
     * Formatted end date of the projection.
     */
    readonly formattedEndDate = computed((): string => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
        if (dataArr.length === 0) return '';
        const end: IProjectionDataPoint | undefined = dataArr[dataArr.length - 1];
        if (!end) return '';
        return new Date(end.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    });
}
