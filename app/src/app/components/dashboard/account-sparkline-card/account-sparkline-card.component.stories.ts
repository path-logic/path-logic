import { provideRouter } from '@angular/router';
import { AccountType, type IAccount } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import { AccountSparklineCardComponent } from './account-sparkline-card.component';

const mockChecking: IAccount = {
    id: 'acc-1',
    name: 'Primary Checking',
    institutionName: 'Chase',
    type: AccountType.Checking,
    clearedBalance: 1487050,
    pendingBalance: 1487050,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    deletedAt: null
};

const mockSavings: IAccount = {
    id: 'acc-2',
    name: 'High Yield Savings',
    institutionName: 'Marcus',
    type: AccountType.Savings,
    clearedBalance: 4532110,
    pendingBalance: 4532110,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    deletedAt: null
};

const mockCredit: IAccount = {
    id: 'acc-3',
    name: 'Gold Rewards',
    institutionName: 'Amex',
    type: AccountType.Credit,
    clearedBalance: 125060,
    pendingBalance: 125060,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    deletedAt: null
};

const meta: Meta<AccountSparklineCardComponent> = {
    title: 'Dashboard/AccountSparklineCard',
    component: AccountSparklineCardComponent,
    decorators: [
        applicationConfig({
            providers: [provideRouter([])]
        })
    ],
    parameters: {
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: true }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<AccountSparklineCardComponent>;

export const Checking: Story = {
    args: {
        account: mockChecking,
        trendPercent: '+1.1%'
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Primary Checking')).toBeInTheDocument();
        await expect(canvas.getByText('$14,870.50')).toBeInTheDocument();
        await expect(canvas.getByText('+1.1%')).toBeInTheDocument();
        await expect(
            canvas.getByRole('button', { name: /Quick Entry for Primary Checking/i })
        ).toBeInTheDocument();
    }
};

export const Savings: Story = {
    args: {
        account: mockSavings,
        trendPercent: '+0.5%'
    }
};

export const Credit: Story = {
    args: {
        account: mockCredit,
        trendPercent: '-2.4%'
    }
};
