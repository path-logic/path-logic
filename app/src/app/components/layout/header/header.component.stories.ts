import { signal } from '@angular/core';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { TransactionStatus } from '@core';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { ThemeService } from '../../../services/theme/theme.service';
import { HeaderComponent } from './header.component';

// Mock LedgerStore to provide a fake balance calculation
const createMockLedgerStore = (clearedTotal: number, pendingTotal: number) => {
    return {
        transactions: signal<Array<any>>([
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
        signOut: fn(async () => {})
    };
};

const createMockThemeService = () => ({
    resolvedTheme: signal('light'),
    setTheme: fn()
});

const createMockAiAssistantService = () => ({
    toggle: fn(),
    isOpen: signal(false)
});

const createMockCommandPaletteService = () => ({
    open: fn(),
    close: fn(),
    isOpen: signal(false)
});

const meta: Meta<HeaderComponent> = {
    title: 'Layout/HeaderComponent',
    component: HeaderComponent,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    },
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([], withDisabledInitialNavigation()),
                { provide: ThemeService, useValue: createMockThemeService() },
                { provide: AiAssistantService, useValue: createMockAiAssistantService() },
                { provide: CommandPaletteService, useValue: createMockCommandPaletteService() }
            ]
        })
    ]
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
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify balance and nav links
        await expect(canvas.getByText('Net Position')).toBeInTheDocument();
        await expect(canvas.getByText('$14,500.00')).toBeInTheDocument();
        await expect(canvas.getByText('Overview')).toBeInTheDocument();
        await expect(canvas.getByText('Accounts')).toBeInTheDocument();

        // Open User Menu
        const userMenuBtn = canvas.getByRole('button', { name: /User menu/i });
        await expect(userMenuBtn).toBeInTheDocument();
        await userEvent.click(userMenuBtn);

        // Verify dropdown content
        await expect(canvas.getByText('Jane Doe')).toBeInTheDocument();
        await expect(canvas.getByText('jane@example.com')).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    }
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
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('-$700.00')).toBeInTheDocument();
    }
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
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const userMenuBtn = canvas.getByRole('button', { name: /User menu/i });
        await userEvent.click(userMenuBtn);
        await expect(canvas.getByText('User')).toBeInTheDocument();
        await expect(canvas.getByText('anonymous@example.com')).toBeInTheDocument();
    }
};
