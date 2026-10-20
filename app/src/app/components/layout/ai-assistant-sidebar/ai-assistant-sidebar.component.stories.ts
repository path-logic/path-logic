import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AiAssistantExportService } from '../../../services/ai-assistant-export/ai-assistant-export.service';
import type { IMessage } from '../../../services/ai-assistant/ai-assistant.service';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { MermaidService } from '../../../services/mermaid/mermaid.service';
import { AiAssistantSidebarComponent } from './ai-assistant-sidebar.component';

const createMockAiService = (
    isOpen = true,
    messages: Array<IMessage> = [],
    isSending = false,
    onSendMessage = fn(async () => {})
) => {
    const openSignal = signal<boolean>(isOpen);
    return {
        isOpen: openSignal,
        messages: signal<Array<IMessage>>(messages),
        isSending: signal<boolean>(isSending),
        toggle: fn(() => openSignal.update(v => !v)),
        open: fn(() => openSignal.set(true)),
        close: fn(() => openSignal.set(false)),
        clearChat: fn(),
        sendMessage: onSendMessage
    };
};

const createMockGeminiService = (hasKey = true) => ({
    hasKey: () => hasKey,
    apiKey: () => (hasKey ? 'mock-gemini-key' : '')
});

const createMockExportService = () => ({
    exportMessageToMarkdown: fn(),
    exportConversationToMarkdown: fn(),
    printContent: fn(),
    copyToClipboard: fn(async () => true)
});

const createMockMermaidService = () => ({
    generateId: () => `mermaid-story-${Math.random().toString(36).substring(2, 7)}`,
    render: async (_id: string, _code: string) =>
        `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f1f5f9" rx="6"/>
            <text x="50%" y="50%" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">Expense Allocation Chart</text>
        </svg>`
});

const defaultMessages: Array<IMessage> = [
    {
        sender: 'assistant',
        text: 'Hello! I am your Path Logic financial assistant. How can I help you optimize your finances today?',
        timestamp: new Date('2026-09-12T10:00:00Z')
    },
    {
        sender: 'user',
        text: 'Can you show me my spending trends for this month?',
        timestamp: new Date('2026-09-12T10:01:00Z')
    },
    {
        sender: 'assistant',
        text: 'You spent **$3,450.00** across 42 transactions this month. Your largest category was **Housing** ($1,850.00).',
        timestamp: new Date('2026-09-12T10:01:30Z')
    }
];

export const MermaidTestMessages: Array<IMessage> = [
    ...defaultMessages,
    {
        sender: 'user',
        text: 'Make it into a chart',
        timestamp: new Date('2026-09-12T10:02:00Z')
    },
    {
        sender: 'assistant',
        text: `Here is the visual breakdown of your top spending categories:

\`\`\`mermaid
pie title 60-Day Category Outflow
    "Housing" : 1850
    "Taxes" : 950
    "Groceries" : 450
    "Utilities" : 200
\`\`\`

| Category | Outflow | % of Total |
| :--- | :--- | :--- |
| **Housing** | $1,850.00 | 53.6% |
| **Taxes** | $950.00 | 27.5% |
| **Groceries** | $450.00 | 13.0% |`,
        timestamp: new Date('2026-09-12T10:02:15Z')
    }
];

const meta: Meta<AiAssistantSidebarComponent> = {
    title: 'Layout/AiAssistantSidebarComponent',
    component: AiAssistantSidebarComponent,
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
                provideRouter([]),
                {
                    provide: AiAssistantService,
                    useValue: createMockAiService(true, defaultMessages)
                },
                {
                    provide: GeminiService,
                    useValue: createMockGeminiService(true)
                },
                {
                    provide: AiAssistantExportService,
                    useValue: createMockExportService()
                },
                {
                    provide: MermaidService,
                    useValue: createMockMermaidService()
                }
            ]
        })
    ]
};

export default meta;
type Story = StoryObj<AiAssistantSidebarComponent>;

export const Collapsed: Story = {
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                {
                    provide: AiAssistantService,
                    useValue: createMockAiService(false, [])
                },
                {
                    provide: GeminiService,
                    useValue: createMockGeminiService(true)
                },
                {
                    provide: AiAssistantExportService,
                    useValue: createMockExportService()
                },
                {
                    provide: MermaidService,
                    useValue: createMockMermaidService()
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const rootDiv = canvasElement.firstElementChild as HTMLElement;
        await expect(rootDiv.classList.contains('translate-x-full')).toBe(true);
    }
};

export const OpenWithMessages: Story = {
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                {
                    provide: AiAssistantService,
                    useValue: createMockAiService(true, defaultMessages)
                },
                {
                    provide: GeminiService,
                    useValue: createMockGeminiService(true)
                },
                {
                    provide: AiAssistantExportService,
                    useValue: createMockExportService()
                },
                {
                    provide: MermaidService,
                    useValue: createMockMermaidService()
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify existing messages rendered
        await expect(canvas.getByText('AI Financial Assistant')).toBeInTheDocument();
        await expect(
            canvas.getByText(/Can you show me my spending trends for this month\?/i)
        ).toBeInTheDocument();
        await expect(canvas.getByText(/You spent/i)).toBeInTheDocument();

        // Type prompt into input and submit
        const input = canvas.getByPlaceholderText('Ask a question about your finances...');
        await expect(input).toBeInTheDocument();
        await userEvent.type(input, 'Suggest a realistic budget');
        await expect(input).toHaveValue('Suggest a realistic budget');

        const sendBtn = canvas.getByRole('button', { name: /Send message/i });
        await expect(sendBtn).toBeInTheDocument();
        await userEvent.click(sendBtn);

        // Verify input is cleared upon sending
        await expect(input).toHaveValue('');
    }
};

export const WithMermaidDiagram: Story = {
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                {
                    provide: AiAssistantService,
                    useValue: createMockAiService(true, MermaidTestMessages)
                },
                {
                    provide: GeminiService,
                    useValue: createMockGeminiService(true)
                },
                {
                    provide: AiAssistantExportService,
                    useValue: createMockExportService()
                },
                {
                    provide: MermaidService,
                    useValue: createMockMermaidService()
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('AI Financial Assistant')).toBeInTheDocument();
        await expect(
            canvas.getByText(/Here is the visual breakdown of your top spending categories:/i)
        ).toBeInTheDocument();
        expect(canvas.getAllByText('Housing').length).toBeGreaterThan(0);
    }
};

export const LoadingState: Story = {
    decorators: [
        applicationConfig({
            providers: [
                provideRouter([]),
                {
                    provide: AiAssistantService,
                    useValue: createMockAiService(true, defaultMessages, true)
                },
                {
                    provide: GeminiService,
                    useValue: createMockGeminiService(true)
                },
                {
                    provide: AiAssistantExportService,
                    useValue: createMockExportService()
                },
                {
                    provide: MermaidService,
                    useValue: createMockMermaidService()
                }
            ]
        })
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Thinking...')).toBeInTheDocument();

        const sendBtn = canvas.getByRole('button', { name: /Send message/i });
        await expect(sendBtn).toBeDisabled();
    }
};
