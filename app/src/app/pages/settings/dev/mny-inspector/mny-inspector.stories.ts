import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import {
    AccountType,
    Frequency,
    PaymentMethod,
    ScheduleType,
    type ISODateString
} from '../../../../core/domain/types';
import type { IMnyHeader, IMnyParseResult } from '../../../../core/parsers/MNYParser';
import { AuthService } from '../../../../services/auth/auth.service';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../../services/security-manager/security-manager.service';
import { SyncService } from '../../../../services/sync/sync.service';
import { DevMnyInspectorComponent } from './mny-inspector.component';

const storySampleParseResult: IMnyParseResult = {
    header: {
        signature: 'MSISAM Database',
        formatVersion: 2050,
        codePage: 1252,
        buildVersion: 1700,
        lcid: 0x0409,
        salt8: new Uint8Array(8),
        salt0: 0x12345678,
        cryptoFlags: 0,
        encryptionMode: 0,
        isSha1: false,
        is128Bit: false,
        passwordVerified: true,
        encryptAllPages: false,
        keyPrefix: new Uint8Array(5),
        passwordBuffer: new Uint8Array(40),
        decryptedPage0: new Uint8Array(4096)
    } satisfies IMnyHeader,
    tables: [
        { id: 15, name: 'ACCT', type: 1 },
        { id: 88, name: 'CAT', type: 1 },
        { id: 300, name: 'PAY', type: 1 },
        { id: 502, name: 'TRN', type: 1 },
        { id: 700, name: 'BILL', type: 1 }
    ],
    accounts: [
        {
            mnyAccountId: 1,
            name: 'Chase Checking',
            abbreviation: 'CHK',
            mnyType: 0,
            mappedType: AccountType.Checking,
            openingBalance: 452000,
            accountNumber: '4091',
            isClosed: false,
            isFavorite: true
        }
    ],
    categories: [
        {
            mnyCategoryId: 201,
            parentCategoryId: null,
            level: 0,
            name: 'Automobile',
            fullName: 'Automobile',
            categoryType: 2,
            isHidden: false
        },
        {
            mnyCategoryId: 202,
            parentCategoryId: 201,
            level: 1,
            name: 'Insurance',
            fullName: 'Automobile : Insurance',
            categoryType: 2,
            isHidden: false
        },
        {
            mnyCategoryId: 203,
            parentCategoryId: 200,
            level: 1,
            name: 'Insurance',
            fullName: 'Home : Insurance',
            categoryType: 2,
            isHidden: false
        }
    ],
    payees: [
        {
            mnyPayeeId: 10,
            name: 'Amazon',
            isHidden: false,
            parentPayeeId: null,
            transactionCount: 25,
            accountIds: [1],
            accountNames: ['Chase Checking']
        },
        {
            mnyPayeeId: 11,
            name: 'AMAZONCOM SEATTLE WA',
            isHidden: true,
            parentPayeeId: 10,
            transactionCount: 8,
            accountIds: [1],
            accountNames: ['Chase Checking']
        }
    ],
    transactions: [],
    recurringSchedules: [
        {
            mnyBillHeadId: 50,
            mnyBillId: 55,
            mnyTransactionId: 900,
            mnyAccountId: 1,
            accountName: 'Chase Checking',
            linkedMnyAccountId: null,
            payee: 'Disney+',
            amount: -18999,
            isEstimatedAmount: true,
            type: ScheduleType.Debit,
            frequency: Frequency.Yearly,
            frequencyLabel: 'Yearly',
            paymentMethod: PaymentMethod.DirectDebit,
            paymentMethodLabel: 'Electronic payment (Epay)',
            startDate: '2024-11-11' as ISODateString,
            endDate: null,
            nextDueDate: '2026-11-11' as ISODateString,
            memo: 'Annual streaming subscription',
            category: 'Bills : Cable & Satellite',
            mnyCategoryId: 201,
            splits: []
        }
    ],
    errors: [],
    warnings: []
};

const meta: Meta<DevMnyInspectorComponent> = {
    title: 'Pages/Settings/Dev/MS Money Inspector',
    component: DevMnyInspectorComponent,
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                {
                    provide: AuthService,
                    useValue: {
                        accessToken: signal(null),
                        currentUser: signal(null),
                        isLoggedIn: signal(false)
                    }
                },
                {
                    provide: LedgerStore,
                    useValue: {
                        isInitialized: signal(true),
                        accounts: signal([]),
                        payees: signal([]),
                        categories: signal([]),
                        transactions: signal([]),
                        schedules: signal([]),
                        syncStatus: signal('idle'),
                        authError: signal(false),
                        hasLocalFallback: signal(false),
                        syncConflicts: signal([]),
                        mergeCount: signal(0)
                    }
                },
                {
                    provide: SecurityManagerService,
                    useValue: {
                        isIdle: signal(false),
                        startMonitoring: () => undefined,
                        resetTimers: () => undefined
                    }
                },
                {
                    provide: SyncService,
                    useValue: {
                        isSyncing: signal(false),
                        getSyncStatus: () => 'idle'
                    }
                }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<DevMnyInspectorComponent>;

export const EmptyState: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('MS Money Investigation Tool')).toBeInTheDocument();
        await expect(canvas.getByText('Choose MS Money File')).toBeInTheDocument();
    }
};

export const LoadedForensicWorkspace: Story = {
    render: () => ({
        props: {
            parseResult: signal(storySampleParseResult),
            fileName: signal('WoodgrovePersonalFinances'),
            fileSize: signal(14680064)
        }
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByTestId('panel-overview')).toBeInTheDocument();

        const payeesTab = canvas.getByTestId('tab-payees');
        await userEvent.click(payeesTab);
        await expect(canvas.getByTestId('panel-payees')).toBeInTheDocument();

        const billsTab = canvas.getByTestId('tab-bills');
        await userEvent.click(billsTab);
        await expect(canvas.getByTestId('panel-bills')).toBeInTheDocument();
        await expect(canvas.getByText('Disney+')).toBeInTheDocument();
    }
};
