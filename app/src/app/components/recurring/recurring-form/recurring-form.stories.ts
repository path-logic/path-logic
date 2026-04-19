import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Frequency, PaymentMethod, ScheduleType } from '@core';
import Lara from '@primeuix/themes/lara';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';

import { RecurringPaymentFormComponent } from './recurring-form.component';

const meta: Meta<RecurringPaymentFormComponent> = {
    title: 'Components/Recurring Payment Form',
    component: RecurringPaymentFormComponent,
    decorators: [
        applicationConfig({
            providers: [
                provideAnimationsAsync(),
                providePrimeNG({
                    theme: {
                        preset: Lara,
                        options: {
                            darkModeSelector: '.dark'
                        }
                    }
                })
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<RecurringPaymentFormComponent>;

export const Default: Story = {
    args: {
        schedule: {
            type: ScheduleType.Debit,
            frequency: Frequency.Monthly,
            paymentMethod: PaymentMethod.ElectronicTransfer,
            autoPost: true,
            amount: 5000,
            payee: 'Internet Bill',
            splits: []
        },
        accounts: [
            { id: '1', name: 'Main Checking' },
            { id: '2', name: 'Savings' }
        ]
    }
};

export const PaycheckMode: Story = {
    args: {
        schedule: {
            type: ScheduleType.Paycheck,
            frequency: Frequency.Biweekly,
            paymentMethod: PaymentMethod.DirectDeposit,
            autoPost: true,
            amount: 500000,
            payee: 'Employer Inc',
            splits: [
                { id: 's1', categoryId: 'cat-gross-pay', amount: 600000, memo: 'Gross Pay' },
                { id: 's2', categoryId: 'cat-federal-tax', amount: -65000, memo: 'Federal Tax' },
                { id: 's3', categoryId: 'cat-state-tax', amount: -25000, memo: 'State Tax' },
                { id: 's4', categoryId: 'cat-social-security', amount: -10000, memo: 'SS' }
            ]
        },
        accounts: [{ id: '1', name: 'Main Checking' }]
    }
};
