import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import {
    AccountType,
    TransactionStatus,
    type IAccount,
    type ISODateString,
    type ITransaction
} from '../../../core/domain/types';
import { AccountAugmentationService } from '../../../services/import-export/account-augmentation.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AccountAugmentationBannerComponent } from './account-augmentation-banner.component';

const mockAccounts: Array<IAccount> = [
    {
        id: 'acct-checking',
        name: 'Primary Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 650000,
        pendingBalance: 650000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    },
    {
        id: 'acct-auto',
        name: 'Honda Auto Loan',
        type: AccountType.AutoLoan,
        institutionName: 'Honda Financial',
        clearedBalance: -1450000,
        pendingBalance: -1450000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    },
    {
        id: 'acct-mortgage',
        name: 'Home Mortgage',
        type: AccountType.Mortgage,
        institutionName: 'Wells Fargo',
        clearedBalance: -24000000,
        pendingBalance: -24000000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    }
];

const mockTransactions: Array<ITransaction> = [
    {
        id: 'tx-1',
        accountId: 'acct-checking',
        payeeId: 'p-1',
        payee: 'Honda Auto Loan Payment',
        date: '2026-10-15' as ISODateString,
        memo: '[Honda Auto Loan]',
        totalAmount: -45000,
        status: TransactionStatus.Reconciled,
        splits: [{ id: 's-1', categoryId: null, memo: '', amount: -45000 }],
        checkNumber: null,
        importHash: 'h-1',
        createdAt: '2026-10-15T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-10-15T00:00:00.000Z' as ISODateString
    },
    {
        id: 'tx-2',
        accountId: 'acct-checking',
        payeeId: 'p-2',
        payee: 'Home Mortgage Payment',
        date: '2026-10-01' as ISODateString,
        memo: '[Home Mortgage]',
        totalAmount: -185000,
        status: TransactionStatus.Reconciled,
        splits: [{ id: 's-2', categoryId: null, memo: '', amount: -185000 }],
        checkNumber: null,
        importHash: 'h-2',
        createdAt: '2026-10-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-10-01T00:00:00.000Z' as ISODateString
    }
];

function createSeededAugmentationService(): AccountAugmentationService {
    const svc = new AccountAugmentationService();
    svc.analyzeLedgerAccounts(mockAccounts, mockTransactions, false);
    return svc;
}

const meta: Meta<AccountAugmentationBannerComponent> = {
    title: 'Ledger/AccountAugmentationBanner',
    component: AccountAugmentationBannerComponent,
    decorators: [
        applicationConfig({
            providers: [
                LedgerStore,
                provideNoopAnimations(),
                {
                    provide: AccountAugmentationService,
                    useFactory: createSeededAugmentationService
                }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<AccountAugmentationBannerComponent>;

export const DestinationAccountBanner: Story = {
    args: {
        accountId: 'acct-auto',
        dialogsOnly: false
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('destination-augmentation-banner')).toBeInTheDocument();
    }
};

export const SourceAccountBannerTwoTargets: Story = {
    args: {
        accountId: 'acct-checking',
        dialogsOnly: false
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('source-augmentation-banner')).toBeInTheDocument();
        await expect(canvas.getByTestId('source-banner-message')).toHaveTextContent(
            'Honda Auto Loan and Home Mortgage'
        );
    }
};
