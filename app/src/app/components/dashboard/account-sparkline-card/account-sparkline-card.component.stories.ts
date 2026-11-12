import { provideRouter } from '@angular/router';
import { AccountType, type IAccount, type ITransaction, TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import {
    AccountTelemetryService,
    TelemetryWindowDays
} from '../../../services/account-telemetry/account-telemetry.service';
import { AccountSparklineCardComponent } from './account-sparkline-card.component';

const telemetryBuilder = new AccountTelemetryService();

const mockChecking: IAccount = {
    id: 'acc-1',
    name: 'Primary Checking',
    institutionName: 'Chase',
    type: AccountType.Checking,
    clearedBalance: 1487050,
    pendingBalance: 1487050,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-11-10',
    deletedAt: null
};

const mockCheckingTxs: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acc-1',
        payeeId: 'p-1',
        date: '2026-10-25',
        payee: 'Direct Deposit',
        memo: '',
        totalAmount: 420000,
        status: TransactionStatus.Cleared,
        splits: [],
        checkNumber: null,
        importHash: 'h1',
        createdAt: '2026-10-25',
        updatedAt: '2026-10-25'
    },
    {
        id: 'tx-2',
        accountId: 'acc-1',
        payeeId: 'p-2',
        date: '2026-11-02',
        payee: 'Apartment Rent',
        memo: '',
        totalAmount: -215000,
        status: TransactionStatus.Cleared,
        splits: [],
        checkNumber: null,
        importHash: 'h2',
        createdAt: '2026-11-02',
        updatedAt: '2026-11-02'
    },
    {
        id: 'tx-3',
        accountId: 'acc-1',
        payeeId: 'p-1',
        date: '2026-11-08',
        payee: 'Direct Deposit',
        memo: '',
        totalAmount: 420000,
        status: TransactionStatus.Cleared,
        splits: [],
        checkNumber: null,
        importHash: 'h3',
        createdAt: '2026-11-08',
        updatedAt: '2026-11-08'
    }
];

const checkingTelemetry30d = telemetryBuilder.buildAccountTelemetry(
    mockChecking,
    mockCheckingTxs,
    [],
    { windowDays: TelemetryWindowDays.ThirtyDays, forecastDays: 14, referenceDate: '2026-11-10' }
);
const checkingTelemetry90d = telemetryBuilder.buildAccountTelemetry(
    mockChecking,
    mockCheckingTxs,
    [],
    { windowDays: TelemetryWindowDays.NinetyDays, forecastDays: 14, referenceDate: '2026-11-10' }
);

const mockSavings: IAccount = {
    id: 'acc-2',
    name: 'High Yield Savings',
    institutionName: 'Marcus',
    type: AccountType.Savings,
    clearedBalance: 4532110,
    pendingBalance: 4532110,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-11-10',
    deletedAt: null
};

const mockCredit: IAccount = {
    id: 'acc-3',
    name: 'Gold Rewards',
    institutionName: 'Amex',
    type: AccountType.Credit,
    clearedBalance: -125060,
    pendingBalance: -125060,
    isActive: true,
    creditCardDetails: {
        creditLimit: 500000,
        interestRate: 0.2199,
        promotionalRates: []
    },
    createdAt: '2026-01-01',
    updatedAt: '2026-11-10',
    deletedAt: null
};

const creditTelemetry = telemetryBuilder.buildAccountTelemetry(
    mockCredit,
    [
        {
            id: 'tx-cc1',
            accountId: 'acc-3',
            payeeId: 'p-air',
            date: '2026-11-04',
            payee: 'Flight Booking',
            memo: '',
            totalAmount: -45060,
            status: TransactionStatus.Cleared,
            splits: [],
            checkNumber: null,
            importHash: 'hcc1',
            createdAt: '2026-11-04',
            updatedAt: '2026-11-04'
        }
    ],
    [],
    { referenceDate: '2026-11-10' }
);

const mockZeroLoan: IAccount = {
    id: 'acc-zero',
    name: '2001 Cobra',
    institutionName: 'Microsoft Money Import',
    type: AccountType.AutoLoan,
    clearedBalance: 0,
    pendingBalance: 0,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-11-10',
    deletedAt: null
};

const zeroTelemetry = telemetryBuilder.buildAccountTelemetry(mockZeroLoan, [], [], {
    referenceDate: '2026-11-10'
});

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
        telemetry: checkingTelemetry30d
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Primary Checking')).toBeInTheDocument();
        await expect(canvas.getByText('$14,870.50')).toBeInTheDocument();
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

export const CreditWithUtilizationCeiling: Story = {
    args: {
        account: mockCredit,
        telemetry: creditTelemetry
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Gold Rewards')).toBeInTheDocument();
        await expect(canvas.getByText('$1,250.60')).toBeInTheDocument();
        await expect(canvas.getByText('25% of limit')).toBeInTheDocument();
        await expect(canvas.getByTestId('sparkline-credit-ceiling')).toBeInTheDocument();
    }
};

export const HeroFullWidth: Story = {
    args: {
        account: mockChecking,
        telemetry: checkingTelemetry30d,
        heroTelemetry90d: checkingTelemetry90d,
        isFullWidth: true,
        isPrimary: true
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Primary Checking')).toBeInTheDocument();
        await expect(canvas.getByTestId('hero-telemetry-summary')).toBeInTheDocument();
        await expect(
            canvas.getByRole('button', { name: /Primary Hero Account/i })
        ).toBeInTheDocument();
    }
};

export const ZeroBalanceMuted: Story = {
    args: {
        account: mockZeroLoan,
        telemetry: zeroTelemetry
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('2001 Cobra')).toBeInTheDocument();
        await expect(
            canvas.getByTestId('sparkline-zero-balance-badge-acc-zero')
        ).toBeInTheDocument();
    }
};

export const PrimaryStarred: Story = {
    args: {
        account: mockSavings,
        trendPercent: '+3.5%',
        isPrimary: true
    }
};
