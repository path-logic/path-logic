import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { AccountType } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { BreadcrumbNavComponent } from './breadcrumb-nav.component';

/**
 * Mock datasets for 1 account vs 2+ accounts vs 0 accounts.
 */
const SINGLE_ACCOUNT = [
    {
        id: 'acc-single',
        name: 'Single Checking',
        type: AccountType.Checking,
        institutionName: 'JPMorgan Chase',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    }
];

const SINGLE_ACCOUNT_TXS = [{ id: 'tx-1', accountId: 'acc-single', totalAmount: 342050 }];

const MULTIPLE_ACCOUNTS = [
    {
        id: 'acc-123',
        name: 'Chase Checking',
        type: AccountType.Checking,
        institutionName: 'JPMorgan Chase',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'acc-456',
        name: 'Amex Gold',
        type: AccountType.Credit,
        institutionName: 'American Express',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 'acc-789',
        name: 'High Yield Savings',
        type: AccountType.Savings,
        institutionName: 'Ally Bank',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    }
];

const MULTIPLE_ACCOUNTS_TXS = [
    { id: 'tx-1', accountId: 'acc-123', totalAmount: 342050 },
    { id: 'tx-2', accountId: 'acc-456', totalAmount: -125000 },
    { id: 'tx-3', accountId: 'acc-789', totalAmount: 1850000 }
];

const defaultMockLedgerStore = {
    accounts: signal(MULTIPLE_ACCOUNTS),
    transactions: signal(MULTIPLE_ACCOUNTS_TXS)
};

const meta: Meta<BreadcrumbNavComponent> = {
    title: 'Layout/BreadcrumbNavComponent',
    component: BreadcrumbNavComponent,
    tags: ['autodocs'],
    parameters: {
        mockOpenCommandPalette: fn()
    },
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                { provide: LedgerStore, useValue: defaultMockLedgerStore },
                {
                    provide: CommandPaletteService,
                    useValue: {
                        open: fn(),
                        close: fn(),
                        isOpen: signal(false)
                    }
                }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<BreadcrumbNavComponent>;

/**
 * Helper to mock the Router URL for a specific story.
 */
const withMockUrl = (url: string) => {
    return applicationConfig({
        providers: [
            provideAppInitializer(() => {
                const router = inject(Router);
                Object.defineProperty(router, 'url', {
                    get: () => url,
                    configurable: true
                });
            })
        ]
    });
};

/**
 * Helper to provide specific account/transaction data to a story.
 */
const withLedgerData = (accountsList: Array<any>, txsList: Array<any> = []) => {
    return applicationConfig({
        providers: [
            {
                provide: LedgerStore,
                useValue: {
                    accounts: signal(accountsList),
                    transactions: signal(txsList)
                }
            }
        ]
    });
};

/**
 * 1. Overview dashboard root navigation bar.
 */
export const Root: Story = {
    decorators: [withMockUrl('/')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const overview = canvas.getByText('Overview');
        await expect(overview).toBeInTheDocument();

        const searchButton = canvas.getByRole('button', { name: /Open Command Palette/i });
        await expect(searchButton).toBeInTheDocument();
    }
};

/**
 * 2. Top-level Accounts directory page (Multiple accounts in store).
 */
export const AccountsIndex: Story = {
    decorators: [withMockUrl('/accounts')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const accountsLink = canvas.getByText('Accounts');
        await expect(accountsLink).toBeInTheDocument();
    }
};

/**
 * 3. SINGLE ACCOUNT: Exactly 1 account in store.
 * Verifies that the breadcrumb renders a clean, static label without a dropdown select menu.
 */
export const SingleAccountStaticBreadcrumb: Story = {
    decorators: [
        withLedgerData(SINGLE_ACCOUNT, SINGLE_ACCOUNT_TXS),
        withMockUrl('/accounts/acc-single')
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify Accounts parent breadcrumb
        const accountsLink = canvas.getByText('Accounts');
        await expect(accountsLink).toBeInTheDocument();

        // Verify dropdown button is NOT rendered
        const dropdownButton = canvas.queryByRole('button', { name: /Switch active account/i });
        await expect(dropdownButton).toBeNull();

        // Verify static account name and formatted balance are rendered
        await expect(canvas.getByText('Single Checking')).toBeInTheDocument();
        await expect(canvas.getByText('($3,420.50)')).toBeInTheDocument();
    }
};

/**
 * 4. MULTIPLE ACCOUNTS (2+): Interactive Account Switcher dropdown.
 * Verifies opening the dropdown, inspecting all accounts with balances, and selecting an account.
 */
export const MultipleAccountsDropdown: Story = {
    decorators: [
        withLedgerData(MULTIPLE_ACCOUNTS, MULTIPLE_ACCOUNTS_TXS),
        withMockUrl('/accounts/acc-123')
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify Accounts parent breadcrumb
        const accountsLink = canvas.getByText('Accounts');
        await expect(accountsLink).toBeInTheDocument();

        // Verify embedded Account Dropdown button is present
        const dropdownButton = canvas.getByRole('button', { name: /Switch active account/i });
        await expect(dropdownButton).toBeInTheDocument();
        await expect(dropdownButton).toHaveTextContent('Chase Checking');

        // Click to open listbox
        await userEvent.click(dropdownButton);

        // Verify dropdown menu options appear
        const amexOption = canvas.getByText('Amex Gold');
        await expect(amexOption).toBeInTheDocument();
        const savingsOption = canvas.getByText('High Yield Savings');
        await expect(savingsOption).toBeInTheDocument();

        // Click on alternate account
        await userEvent.click(amexOption);
    }
};

/**
 * 5. SINGLE ACCOUNT DEEP NAVIGATION: /accounts/:accountId/info with 1 account.
 * Verifies static account label and trailing sub-route detail breadcrumb.
 */
export const SingleAccountDeepBreadcrumb: Story = {
    decorators: [
        withLedgerData(SINGLE_ACCOUNT, SINGLE_ACCOUNT_TXS),
        withMockUrl('/accounts/acc-single/info')
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Accounts')).toBeInTheDocument();
        await expect(canvas.getByText('Single Checking')).toBeInTheDocument();
        await expect(canvas.getByText('Account Details')).toBeInTheDocument();

        // No dropdown button
        await expect(canvas.queryByRole('button', { name: /Switch active account/i })).toBeNull();
    }
};

/**
 * 6. MULTIPLE ACCOUNTS DEEP NAVIGATION: /accounts/:accountId/info with 2+ accounts.
 * Verifies interactive switcher and trailing sub-route detail breadcrumb.
 */
export const MultipleAccountsDeepBreadcrumb: Story = {
    decorators: [
        withLedgerData(MULTIPLE_ACCOUNTS, MULTIPLE_ACCOUNTS_TXS),
        withMockUrl('/accounts/acc-123/info')
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Accounts')).toBeInTheDocument();
        const dropdownButton = canvas.getByRole('button', { name: /Switch active account/i });
        await expect(dropdownButton).toBeInTheDocument();
        await expect(canvas.getByText('Account Details')).toBeInTheDocument();
    }
};

/**
 * 7. ZERO ACCOUNTS (Empty Store / Onboarding).
 * Verifies breadcrumb renders gracefully without errors or dropdown.
 */
export const ZeroAccountsBreadcrumb: Story = {
    decorators: [withLedgerData([]), withMockUrl('/accounts')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Accounts')).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: /Switch active account/i })).toBeNull();
    }
};

/**
 * 8. Global Search / Command Palette trigger interaction test.
 */
export const SearchTriggerInteraction: Story = {
    decorators: [withMockUrl('/settings')],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const searchButton = canvas.getByRole('button', { name: /Open Command Palette/i });
        await expect(searchButton).toBeInTheDocument();

        // Click the search button to ensure it is interactive
        await userEvent.click(searchButton);
    }
};
