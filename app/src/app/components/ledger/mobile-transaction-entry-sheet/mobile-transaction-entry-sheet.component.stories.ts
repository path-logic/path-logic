import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { expect, within } from 'storybook/test';
import {
    AccountType,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ICategory,
    type IPayee,
    type ISODateString
} from '../../../core';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { MobileTransactionEntrySheetComponent } from './mobile-transaction-entry-sheet.component';

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Main Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 542000 as Cents,
        pendingBalance: 542000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'acc-2',
        name: 'High Yield Savings',
        type: AccountType.Savings,
        institutionName: 'Ally',
        clearedBalance: 1500000 as Cents,
        pendingBalance: 1500000 as Cents,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    }
];

const mockPayees: Array<IPayee> = [
    {
        id: 'p-1',
        name: 'Whole Foods Market',
        address: null,
        city: null,
        state: null,
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: 'c-1',
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'p-2',
        name: 'Starbucks Coffee',
        address: null,
        city: null,
        state: null,
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        notes: null,
        defaultCategoryId: 'c-2',
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    }
];

const mockCategories: Array<ICategory> = [
    {
        id: 'c-1',
        name: 'Groceries',
        parentId: null,
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    },
    {
        id: 'c-2',
        name: 'Dining & Drinks',
        parentId: null,
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00Z' as ISODateString
    }
];

const mockLedgerStore = {
    accounts: signal(mockAccounts),
    payees: signal(mockPayees),
    categories: signal(mockCategories),
    addTransaction: () => {},
    updateTransaction: () => {},
    applyReconciliationBatch: () => {}
};

const meta: Meta<MobileTransactionEntrySheetComponent> = {
    title: 'Ledger/MobileTransactionEntrySheet',
    component: MobileTransactionEntrySheetComponent,
    decorators: [
        applicationConfig({
            providers: [
                provideNoopAnimations(),
                { provide: LedgerStore, useValue: mockLedgerStore }
            ]
        }),
        moduleMetadata({
            imports: [MobileTransactionEntrySheetComponent]
        })
    ],
    parameters: {
        layout: 'fullscreen',
        viewport: { defaultViewport: 'mobile1' }
    }
};

export default meta;
type Story = StoryObj<MobileTransactionEntrySheetComponent>;

export const Default: Story = {
    args: {
        visible: true,
        accountId: 'acc-1'
    },
    render: args => ({
        props: args,
        template: `
            <app-mobile-transaction-entry-sheet
                [visible]="visible"
                [accountId]="accountId"
            ></app-mobile-transaction-entry-sheet>
        `
    }),
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText(/New Transaction/i)).toBeInTheDocument();
        await expect(await body.findByRole('button', { name: /save/i })).toBeInTheDocument();
    }
};

export const EditMode: Story = {
    args: {
        visible: true,
        accountId: 'acc-1',
        transaction: {
            id: 'tx-100',
            accountId: 'acc-1',
            date: '2026-08-15' as ISODateString,
            payee: 'Whole Foods Market',
            payeeId: 'p-1',
            memo: 'Weekly produce',
            totalAmount: -4250 as Cents,
            status: TransactionStatus.Cleared,
            splits: [{ id: 's-1', amount: -4250 as Cents, categoryId: 'c-1', memo: '' }],
            checkNumber: null,
            importHash: 'manual-100',
            createdAt: '2026-08-15T00:00:00Z' as ISODateString,
            updatedAt: '2026-08-15T00:00:00Z' as ISODateString
        }
    },
    render: args => ({
        props: args,
        template: `
            <app-mobile-transaction-entry-sheet
                [visible]="visible"
                [accountId]="accountId"
                [transaction]="transaction"
            ></app-mobile-transaction-entry-sheet>
        `
    }),
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByText(/Edit Transaction/i)).toBeInTheDocument();
    }
};

export const DarkMode: Story = {
    args: {
        visible: true,
        accountId: 'acc-1'
    },
    parameters: {
        theme: 'dark'
    }
};
