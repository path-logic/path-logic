import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import type { IAccount, ICategory, IPayee, IRecurringSchedule } from '@core';
import { Frequency, PaymentMethod, ScheduleType } from '@core';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { RecurringScheduleFormComponent } from './recurring-schedule-form.component';

const mockAccounts: Array<IAccount> = [
    {
        id: 'acc-1',
        name: 'Main Checking',
        type: 'checking' as any,
        institutionName: 'Chase',
        clearedBalance: 100000,
        pendingBalance: 100000,
        isActive: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    }
];

const mockPayees: Array<IPayee> = [
    {
        id: 'payee-1',
        name: 'Comcast Internet',
        defaultCategoryId: null,
        notes: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    }
];

const mockCategories: Array<ICategory> = [
    {
        id: 'cat-utilities',
        name: 'Utilities',
        parentId: null,
        description: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    }
];

const mockSchedules: Array<IRecurringSchedule> = [
    {
        id: 'sched-1',
        accountId: 'acc-1',
        payee: 'Comcast Internet',
        amount: 8500,
        type: ScheduleType.Debit,
        frequency: Frequency.Monthly,
        paymentMethod: PaymentMethod.ElectronicTransfer,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: null,
        nextDueDate: '2026-09-01T00:00:00.000Z',
        lastOccurredDate: null,
        splits: [],
        memo: 'High speed internet',
        autoPost: true,
        isActive: true
    }
];

const meta: Meta<RecurringScheduleFormComponent> = {
    title: 'Pages/Recurring/RecurringScheduleForm',
    component: RecurringScheduleFormComponent,
    parameters: {
        layout: 'fullscreen'
    },
    decorators: [
        applicationConfig({
            providers: [
                provideNoopAnimations(),
                provideRouter([]),
                {
                    provide: LedgerStore,
                    useValue: {
                        isInitialized: signal(true),
                        syncStatus: signal('idle'),
                        authError: signal(false),
                        hasLocalFallback: signal(true),
                        mergeCount: signal(0),
                        syncConflicts: signal([]),
                        totalClearedBalance: signal(0),
                        totalPendingBalance: signal(0),
                        transactions: signal([]),
                        accounts: signal<Array<IAccount>>(mockAccounts),
                        payees: signal<Array<IPayee>>(mockPayees),
                        categories: signal<Array<ICategory>>(mockCategories),
                        schedules: signal<Array<IRecurringSchedule>>(mockSchedules),
                        addSchedule: async () => {},
                        updateSchedule: async () => {}
                    }
                },
                {
                    provide: AuthService,
                    useValue: {
                        accessToken: signal<string | null>(null),
                        currentUser: signal(null),
                        isLoggedIn: signal(true),
                        isInitializing: signal(false),
                        signInWithGoogle: () => {}
                    }
                }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<RecurringScheduleFormComponent>;

export const NewSchedule: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify page header
        await expect(canvas.getByText(/New Recurring Schedule/i)).toBeInTheDocument();

        // Verify type buttons
        await expect(canvas.getByText(/Debit \/ Bill/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Deposit \/ Income/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Paycheck/i)).toBeInTheDocument();

        // Type amount and payee
        const amountInput = canvas.getByLabelText(/Amount \(\$\)/i);
        await userEvent.type(amountInput, '120.00');

        const payeeInput = canvas.getByLabelText(/Payee \/ Bill Name/i);
        await userEvent.type(payeeInput, 'Electric Utility');

        // Verify submit button is enabled
        const saveBtn = canvas.getByRole('button', { name: /Create Schedule/i });
        await expect(saveBtn).toBeEnabled();
    }
};

export const MobileViewport: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'mobile1'
        }
    }
};

export const TabletViewport: Story = {
    parameters: {
        viewport: {
            defaultViewport: 'tablet'
        }
    }
};

export const DarkMode: Story = {
    parameters: {
        theme: 'dark'
    }
};

export const LightMode: Story = {
    parameters: {
        theme: 'light'
    }
};
