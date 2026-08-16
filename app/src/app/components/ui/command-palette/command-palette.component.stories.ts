import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AccountType } from '@core';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { expect, userEvent, within } from 'storybook/test';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { CommandPaletteService } from '../../../services/command-palette/command-palette.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { CommandPaletteComponent } from './command-palette.component';

const meta: Meta<CommandPaletteComponent> = {
    title: 'UI/CommandPalette',
    component: CommandPaletteComponent,
    decorators: [
        applicationConfig({
            providers: [
                provideHttpClient(),
                provideRouter([]),
                {
                    provide: LedgerStore,
                    useValue: {
                        accounts: () => [
                            {
                                id: 'acc-1',
                                name: 'Everyday Checking',
                                type: AccountType.Checking,
                                institutionName: 'Chase Bank',
                                currency: 'USD',
                                isActive: true,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            },
                            {
                                id: 'acc-2',
                                name: 'Emergency Fund',
                                type: AccountType.Savings,
                                institutionName: 'Ally Bank',
                                currency: 'USD',
                                isActive: true,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                        ]
                    }
                },
                {
                    provide: UserSettingsStore,
                    useValue: {
                        getSetting: (key: string) => (key === 'apiKey' ? 'test-api-key' : null)
                    }
                },
                {
                    provide: AiAssistantService,
                    useValue: {
                        open: () => {},
                        sendMessage: () => Promise.resolve()
                    }
                },
                CommandPaletteService
            ]
        })
    ],
    parameters: {
        layout: 'fullscreen',
        a11y: {
            config: {
                rules: [{ id: 'color-contrast', enabled: false }]
            }
        }
    }
};

export default meta;
type Story = StoryObj<CommandPaletteComponent>;

export const DefaultOpen: Story = {
    render: () => ({
        template: `
            <div class="h-screen w-screen p-8 bg-surface-50 dark:bg-surface-950">
                <app-command-palette />
            </div>
        `
    }),
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        // Press Cmd+K or open programmatically
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
        window.dispatchEvent(event);

        const searchInput = await body.findByRole('textbox', {
            name: /command palette search input/i
        });
        await expect(searchInput).toBeInTheDocument();

        // Type search query
        await userEvent.type(searchInput, 'Checking');
        const checkingOption = await body.findByText('Everyday Checking');
        await expect(checkingOption).toBeInTheDocument();
    }
};

export const SearchWithAiAction: Story = {
    render: () => ({
        template: `
            <div class="h-screen w-screen p-8 bg-surface-50 dark:bg-surface-950">
                <app-command-palette />
            </div>
        `
    }),
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
        window.dispatchEvent(event);

        const searchInput = await body.findByRole('textbox', {
            name: /command palette search input/i
        });

        // Type query to test AI option
        await userEvent.type(searchInput, 'How much did I spend on groceries?');
        const aiOption = await body.findByText(/Ask AI:/i);
        await expect(aiOption).toBeInTheDocument();
    }
};
