'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { type IProjectionDataPoint, Money } from '@path-logic/core';
import { cn } from '@/lib/utils';

interface IProjectionChartProps {
    data: Array<IProjectionDataPoint>;
    height?: number;
    className?: string;
}

export function ProjectionChart({
    data,
    height = 200,
    className,
}: IProjectionChartProps): React.JSX.Element {
    const points = useMemo(() => {
        if (!data.length) return [];

        const min = Math.min(...data.map((d: IProjectionDataPoint) => d.projectedBalance));
        const max = Math.max(...data.map((d: IProjectionDataPoint) => d.projectedBalance));
        const range = max - min || 1;

        return data.map((d: IProjectionDataPoint, i: number) => ({
            x: (i / (data.length - 1)) * 100,
            y: 100 - ((d.projectedBalance - min) / range) * 100,
            balance: d.projectedBalance,
            date: d.date,
        }));
    }, [data]);

    const pathData = useMemo(() => {
        if (points.length < 2) return '';
        return points.reduce(
            (path: string, p: { x: number; y: number }, i: number) =>
                i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`,
            '',
        );
    }, [points]);

    const areaPath = useMemo(() => {
        if (points.length < 2) return '';
        return `${pathData} L 100 100 L 0 100 Z`;
    }, [pathData, points]);

    if (!data.length) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center bg-muted/10 rounded-sm border border-dashed border-border',
                    className,
                )}
                style={{ height }}
            >
                <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-50">
                    No projection data available
                </p>
            </div>
        );
    }

    const currentBalance = data[0]?.projectedBalance || 0;
    const finalBalance = data[data.length - 1]?.projectedBalance || 0;
    const isUp = finalBalance >= currentBalance;

    return (
        <div className={cn('relative group', className)}>
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        90-Day Forecast
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-black tracking-tighter">
                            {Money.formatCurrency(finalBalance)}
                        </span>
                        <span
                            className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tighter',
                                isUp
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-destructive/10 text-destructive',
                            )}
                        >
                            {isUp ? '↑' : '↓'}{' '}
                            {Money.formatCurrency(Math.abs(finalBalance - currentBalance))}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                        Projected Change
                    </p>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground italic">
                        By{' '}
                        {new Date(data[data.length - 1]!.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </p>
                </div>
            </div>

            <div className="relative overflow-visible" style={{ height }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                >
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="0%"
                                stopColor={isUp ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                                stopOpacity="0.2"
                            />
                            <stop
                                offset="100%"
                                stopColor={isUp ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                                stopOpacity="0"
                            />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line
                        x1="0"
                        y1="25"
                        x2="100"
                        y2="25"
                        stroke="currentColor"
                        className="text-border/30"
                        strokeWidth="0.1"
                        strokeDasharray="1,1"
                    />
                    <line
                        x1="0"
                        y1="50"
                        x2="100"
                        y2="50"
                        stroke="currentColor"
                        className="text-border/30"
                        strokeWidth="0.1"
                        strokeDasharray="1,1"
                    />
                    <line
                        x1="0"
                        y1="75"
                        x2="100"
                        y2="75"
                        stroke="currentColor"
                        className="text-border/30"
                        strokeWidth="0.1"
                        strokeDasharray="1,1"
                    />

                    {/* Area */}
                    <path d={areaPath} fill="url(#chartGradient)" />

                    {/* Line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke={isUp ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    />
                </svg>

                {/* Axes Labels */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none font-bold uppercase">
                    <div className="absolute top-0 left-0 text-[8px] text-muted-foreground/50 tracking-tighter">
                        Forecast
                    </div>
                    <div className="absolute bottom-0 left-0 text-[8px] text-muted-foreground/50 tracking-tighter">
                        Current
                    </div>
                </div>
            </div>

            {/* Timeline ticks */}
            <div className="flex justify-between mt-2 px-1">
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">
                    Today
                </span>
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">30d</span>
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">60d</span>
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">90d</span>
            </div>
        </div>
    );
}
