import { signal } from '@angular/core';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { HeaderComponent } from './header.component';

// Mock LedgerStore to provide a fake balance calculation
const createMockLedgerStore = (clearedTotal: number, pendingTotal: number) => {
    return {
        transactions: signal([
            { status: TransactionStatus.Cleared, totalAmount: clearedTotal },
            { status: TransactionStatus.Pending, totalAmount: pendingTotal }
        ]),
        isInitialized: signal(true)
    };
};

// Mock AuthService to provide fake user data
const createMockAuthService = (displayName: string | null, email: string) => {
    return {
        currentUser: signal({
            displayName,
            email,
            photoURL: null
        }),
        signOut: async () => {}
    };
};

const meta: Meta<HeaderComponent> = {
    title: 'Layout/HeaderComponent',
    component: HeaderComponent,
    tags: ['autodocs'],
    decorators: [
        applicationConfig({
            providers: [provideRouter([], withDisabledInitialNavigation())]
        })
    ],
    parameters: {
        layout: 'fullscreen'
    }
};

export default meta;
type Story = StoryObj<HeaderComponent>;

/**
 * Standard header with a positive balance and logged-in user.
 */
export const Default: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockLedgerStore(1500000, -50000) }, // $14,500
                {
                    provide: AuthService,
                    useValue: createMockAuthService('Jane Doe', 'jane@example.com')
                }
            ]
        })
    ]
};

/**
 * Header showing a negative network balance.
 */
export const NegativeBalance: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockLedgerStore(-50000, -20000) }, // -$700
                {
                    provide: AuthService,
                    useValue: createMockAuthService('John Smith', 'john@example.com')
                }
            ]
        })
    ]
};

/**
 * Header when the user has no display name (falls back to "User").
 */
export const NoDisplayName: Story = {
    decorators: [
        applicationConfig({
            providers: [
                { provide: LedgerStore, useValue: createMockLedgerStore(0, 0) },
                {
                    provide: AuthService,
                    useValue: createMockAuthService(null, 'anonymous@example.com')
                }
            ]
        })
    ]
};
