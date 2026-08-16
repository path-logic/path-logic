import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';

import type { IPayee } from '../../../core/domain/types';
import { AuthService } from '../../../services/auth/auth.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { SecurityManagerService } from '../../../services/security-manager/security-manager.service';
import { PayeeFormComponent } from './payee-form.component';

const mockPayees: Array<IPayee> = [
    {
        id: 'payee-1',
        name: 'Whole Foods Market',
        defaultCategoryId: 'cat-groceries',
        notes: 'Organic grocery purchases',
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

const mockCategories = [
    { id: 'cat-groceries', name: 'Groceries' },
    { id: 'cat-utilities', name: 'Utilities' },
    { id: 'cat-housing', name: 'Housing & Rent' }
];

const meta: Meta<PayeeFormComponent> = {
    title: 'Pages/Payees/PayeeForm',
    component: PayeeFormComponent,
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
                        accounts: signal([]),
                        payees: signal<Array<IPayee>>(mockPayees),
                        categories: signal(mockCategories),
                        updatePayee: async () => {},
                        getOrCreatePayee: async (name: string) => ({ id: 'new-id', name })
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
                    provide: SecurityManagerService,
                    useValue: {
                        isIdle: signal(false),
                        startMonitoring: () => {},
                        resetTimers: () => {},
                        cleanup: () => {}
                    }
                }
            ]
        }),
        moduleMetadata({
            imports: [PayeeFormComponent]
        })
    ]
};

export default meta;
type Story = StoryObj<PayeeFormComponent>;

export const NewPayee: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify page header
        await expect(canvas.getByText(/New Payee/i)).toBeInTheDocument();

        // Verify required name input
        const nameInput = canvas.getByLabelText(/Payee Name/i);
        await expect(nameInput).toBeInTheDocument();
        await userEvent.type(nameInput, 'Trader Joe');

        // Verify category select
        const categorySelect = canvas.getByLabelText(/Default Category/i);
        await expect(categorySelect).toBeInTheDocument();

        // Verify notes textarea
        const notesInput = canvas.getByLabelText(/Notes & Matching Rules/i);
        await expect(notesInput).toBeInTheDocument();
        await userEvent.type(notesInput, 'Weekly groceries');

        // Verify submit button is enabled
        const submitBtn = canvas.getByRole('button', { name: /Create Payee/i });
        await expect(submitBtn).toBeEnabled();
    }
};

export const EditPayee: Story = {
    args: {
        initialPayee: mockPayees[0]!
    },
    render: args => ({
        props: args,
        template: `<payee-form [initialPayee]="initialPayee"></payee-form>`
    }),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(/Edit Payee/i)).toBeInTheDocument();
        await expect(canvas.getByDisplayValue(/Whole Foods Market/i)).toBeInTheDocument();
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
