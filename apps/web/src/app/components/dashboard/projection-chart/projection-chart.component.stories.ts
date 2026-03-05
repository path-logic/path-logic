import { type IProjectionDataPoint } from '@path-logic/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { ProjectionChartComponent } from './projection-chart.component';

const generateMockData = (
    startBalance: number,
    isTrendingUp: boolean,
): Array<IProjectionDataPoint> => {
    const data: Array<IProjectionDataPoint> = [];
    let currentBalance = startBalance;
    const now = new Date();

    for (let i = 0; i < 90; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() + i);

        // Random daily fluctuation
        const fluctuation = (Math.random() - 0.5) * 50000; // -$500 to +$500

        // Trend component
        const trend = isTrendingUp ? 15000 : -10000;

        // Income/Expense spikes every ~14 days (paycheck/rent)
        let spike = 0;
        if (i > 0 && i % 14 === 0) {
            spike = isTrendingUp ? 200000 : -150000;
        }

        currentBalance += fluctuation + trend + spike;

        data.push({
            date: date.toISOString(),
            projectedBalance: currentBalance,
            delta: fluctuation + trend + spike,
            items: [],
        });
    }

    return data;
};

const meta: Meta<ProjectionChartComponent> = {
    title: 'Dashboard/ProjectionChartComponent',
    component: ProjectionChartComponent,
    tags: ['autodocs'],
    parameters: {
        // Use a dark background like the dashboard will have
        backgrounds: { default: 'dark' },
    },
};

export default meta;
type Story = StoryObj<ProjectionChartComponent>;

export const TrendingUp: Story = {
    args: {
        data: generateMockData(500000, true), // Start at $5,000
        height: 250,
        className:
            'w-full max-w-4xl mx-auto mt-8 border border-white/10 rounded-xl p-6 bg-black/50',
    },
};

export const TrendingDown: Story = {
    args: {
        data: generateMockData(1500000, false), // Start at $15,000
        height: 250,
        className:
            'w-full max-w-4xl mx-auto mt-8 border border-white/10 rounded-xl p-6 bg-black/50',
    },
};

export const EmptyState: Story = {
    args: {
        data: [],
        height: 250,
        className:
            'w-full max-w-4xl mx-auto mt-8 border border-white/10 rounded-xl p-6 bg-black/50',
    },
};
