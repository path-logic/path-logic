import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type IProjectionDataPoint, Money } from '@path-logic/core';

/**
 * Interface for internal coordinate mapping.
 */
interface IChartPoint {
    x: number;
    y: number;
    balance: number;
    date: string;
}

/**
 * Premium SVG-based cashflow projection chart.
 * Ported from React Sim-X visualization. Uses Angular signals for reactive rendering.
 */
@Component({
    selector: 'app-projection-chart',
    standalone: true,
    imports: [],
    templateUrl: './projection-chart.component.html',
    styleUrl: './projection-chart.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionChartComponent {
    /**
     * 90-day projection data points.
     */
    readonly data = input<Array<IProjectionDataPoint>>(new Array<IProjectionDataPoint>());

    /**
     * Component height in pixels.
     * @default 200
     */
    readonly height = input<number>(200);

    /**
     * Additional CSS classes for the container.
     */
    readonly className = input<string>('');

    /**
     * Maps data points to 0-100 normalized SVG coordinates.
     */
    readonly points = computed((): Array<IChartPoint> => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
        if (dataArr.length === 0) return new Array<IChartPoint>();

        const balances: Array<number> = dataArr.map(
            (d: IProjectionDataPoint): number => d.projectedBalance,
        );
        const min: number = Math.min(...balances);
        const max: number = Math.max(...balances);
        const range: number = max - min || 1;

        return dataArr.map(
            (d: IProjectionDataPoint, i: number): IChartPoint =>
                ({
                    x: (i / (dataArr.length - 1)) * 100,
                    y: 100 - ((d.projectedBalance - min) / range) * 100,
                    balance: d.projectedBalance,
                    date: d.date,
                }) satisfies IChartPoint,
        );
    });

    /**
     * Generates the SVG path 'd' attribute for the line.
     */
    readonly pathData = computed((): string => {
        const pts: Array<IChartPoint> = this.points();
        if (pts.length < 2) return '';
        return pts.reduce(
            (path: string, p: IChartPoint, i: number): string =>
                i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`,
            '',
        );
    });

    /**
     * Generates the SVG path 'd' attribute for the filled area.
     */
    readonly areaPath = computed((): string => {
        const pts: Array<IChartPoint> = this.points();
        if (pts.length < 2) return '';
        return `${this.pathData()} L 100 100 L 0 100 Z`;
    });

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
     * Formatted final projected balance.
     */
    readonly formattedFinalBalance = computed((): string => {
        const dataArr: Array<IProjectionDataPoint> = this.data();
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
            day: 'numeric',
        });
    });
}
