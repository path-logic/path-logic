import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import type { IAccount } from '@core';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { AccountFormComponent } from './account-form.component';

const meta: Meta<AccountFormComponent> = {
    title: 'Pages/Accounts/AccountForm',
    component: AccountFormComponent,
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
                        accounts: signal<Array<IAccount>>([]),
                        payees: signal([]),
                        categories: signal([]),
                        addAccount: async () => {}
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
                },
                {
                    provide: PostHogService,
                    useValue: {
                        posthog: { capture: () => {} }
                    }
                }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<AccountFormComponent>;

export const Step1SelectType: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify Step 1 headers and options
        await expect(canvas.getByText(/Select Account Type/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Checking/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Savings/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Credit Card/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Cash/i)).toBeInTheDocument();
    }
};

export const Step2EnterDetails: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click checking option to transition to Step 2
        const checkingBtn = canvas.getByText(/Checking/i);
        await userEvent.click(checkingBtn);

        // Verify Step 2 details form
        await expect(
            canvas.getByRole('heading', { name: /Account Details/i, level: 1 })
        ).toBeInTheDocument();
        const nameInput = canvas.getByLabelText(/Account Name/i);
        await expect(nameInput).toBeInTheDocument();
        await expect(nameInput).toHaveValue('Main Checking');

        const instInput = canvas.getByLabelText(/Financial Institution/i);
        await expect(instInput).toBeInTheDocument();
        await userEvent.type(instInput, 'Chase Bank');
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
