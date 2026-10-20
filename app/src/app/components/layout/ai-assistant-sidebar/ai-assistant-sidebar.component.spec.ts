import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantExportService } from '../../../services/ai-assistant-export/ai-assistant-export.service';
import type { IMessage } from '../../../services/ai-assistant/ai-assistant.service';
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { MermaidService } from '../../../services/mermaid/mermaid.service';
import { AiAssistantSidebarComponent } from './ai-assistant-sidebar.component';

describe('AiAssistantSidebarComponent', () => {
    let fixture: ComponentFixture<AiAssistantSidebarComponent>;
    let component: AiAssistantSidebarComponent;

    const mockIsOpen = signal<boolean>(false);
    const mockMessages = signal<Array<IMessage>>([
        {
            sender: 'assistant',
            text: 'Hello! I am your Path Logic financial assistant.',
            timestamp: new Date('2026-09-12T10:00:00Z')
        }
    ]);
    const mockIsSending = signal<boolean>(false);
    const mockHasKey = signal<boolean>(true);

    const mockAiService = {
        isOpen: mockIsOpen,
        messages: mockMessages,
        isSending: mockIsSending,
        toggle: vi.fn(() => mockIsOpen.update(v => !v)),
        open: vi.fn(() => mockIsOpen.set(true)),
        close: vi.fn(() => mockIsOpen.set(false)),
        clearChat: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue(undefined)
    };

    const mockGeminiService = {
        hasKey: vi.fn(() => mockHasKey()),
        apiKey: vi.fn().mockReturnValue('mock-api-key')
    };

    const mockExportService = {
        exportMessageToMarkdown: vi.fn(),
        exportConversationToMarkdown: vi.fn(),
        printContent: vi.fn(),
        copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    const mockMermaidService = {
        generateId: vi.fn().mockReturnValue('mermaid-mock-id'),
        render: vi.fn().mockResolvedValue('<svg><text>Mock Chart</text></svg>')
    };

    beforeEach(async () => {
        mockIsOpen.set(false);
        mockMessages.set([
            {
                sender: 'assistant',
                text: 'Hello! I am your Path Logic financial assistant.',
                timestamp: new Date('2026-09-12T10:00:00Z')
            }
        ]);
        mockIsSending.set(false);
        mockHasKey.set(true);
        mockAiService.clearChat.mockClear();
        mockAiService.sendMessage.mockClear();
        mockAiService.close.mockClear();
        mockAiService.open.mockClear();
        mockExportService.exportMessageToMarkdown.mockClear();
        mockExportService.exportConversationToMarkdown.mockClear();
        mockExportService.printContent.mockClear();
        mockExportService.copyToClipboard.mockClear();

        await TestBed.configureTestingModule({
            imports: [AiAssistantSidebarComponent],
            providers: [
                provideRouter([]),
                { provide: AiAssistantService, useValue: mockAiService },
                { provide: GeminiService, useValue: mockGeminiService },
                { provide: AiAssistantExportService, useValue: mockExportService },
                { provide: MermaidService, useValue: mockMermaidService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AiAssistantSidebarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('creates the AI assistant sidebar component', () => {
        expect(component).toBeTruthy();
    });

    it('manages sidebar collapsed and expanded class visibility', () => {
        const rootDiv = fixture.nativeElement.firstElementChild as HTMLElement;
        expect(rootDiv.classList.contains('translate-x-full')).toBe(true);
        expect(rootDiv.classList.contains('translate-x-0')).toBe(false);

        mockIsOpen.set(true);
        fixture.detectChanges();
        expect(rootDiv.classList.contains('translate-x-0')).toBe(true);
        expect(rootDiv.classList.contains('translate-x-full')).toBe(false);
    });

    it('calls aiService.close() when close button is clicked', () => {
        mockIsOpen.set(true);
        fixture.detectChanges();

        const closeBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Close Assistant"]'
        ) as HTMLButtonElement;
        expect(closeBtn).not.toBeNull();

        closeBtn.click();
        expect(mockAiService.close).toHaveBeenCalled();
    });

    it('calls aiService.clearChat() when clear chat button is clicked', () => {
        mockIsOpen.set(true);
        fixture.detectChanges();

        const clearBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Clear Chat History"]'
        ) as HTMLButtonElement;
        expect(clearBtn).not.toBeNull();

        clearBtn.click();
        expect(mockAiService.clearChat).toHaveBeenCalled();
    });

    it('renders API key required banner when geminiService.hasKey() is false', () => {
        mockHasKey.set(false);
        mockIsOpen.set(true);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('API Key Required');
        expect(compiled.textContent).toContain('Configure Settings');

        // Shortcut buttons should not be present
        expect(compiled.querySelector('button[disabled]')).not.toBeNull();
    });

    it('renders message history correctly with Markdown viewer for assistant', () => {
        mockIsOpen.set(true);
        mockMessages.set([
            {
                sender: 'assistant',
                text: 'Welcome to your **financial overview**.',
                timestamp: new Date('2026-09-12T10:00:00Z')
            },
            {
                sender: 'user',
                text: 'How much did I spend on groceries this month?',
                timestamp: new Date('2026-09-12T10:01:00Z')
            }
        ]);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('financial overview');
        expect(compiled.textContent).toContain('How much did I spend on groceries this month?');
        expect(compiled.querySelector('app-markdown-viewer')).not.toBeNull();
    });

    it('shows thinking spinner when isSending is true', () => {
        mockIsOpen.set(true);
        mockIsSending.set(true);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Thinking...');
    });

    it('submits typed message on send button click', async () => {
        mockIsOpen.set(true);
        component.inputText.set('Show my net worth');
        fixture.detectChanges();

        const sendBtn = fixture.nativeElement.querySelector(
            'button[aria-label="Send message"]'
        ) as HTMLButtonElement;
        expect(sendBtn.disabled).toBe(false);

        await component.handleSend();
        expect(mockAiService.sendMessage).toHaveBeenCalledWith('Show my net worth');
        expect(component.inputText()).toBe('');
    });

    it('submits on Enter key press', () => {
        mockIsOpen.set(true);
        component.inputText.set('List recent recurring transactions');
        fixture.detectChanges();

        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
        component.onKeyPress(enterEvent);

        expect(mockAiService.sendMessage).toHaveBeenCalledWith(
            'List recent recurring transactions'
        );
        expect(component.inputText()).toBe('');
    });

    it('does not send message if inputText is empty or whitespace', async () => {
        mockIsOpen.set(true);
        component.inputText.set('   ');
        await component.handleSend();
        expect(mockAiService.sendMessage).not.toHaveBeenCalled();
    });

    it('triggers shortcut actions correctly including chart', () => {
        mockIsOpen.set(true);
        fixture.detectChanges();

        component.runShortcut('chart');
        expect(mockAiService.sendMessage).toHaveBeenCalledWith(
            expect.stringContaining('Mermaid pie chart')
        );

        component.runShortcut('cashflow');
        expect(mockAiService.sendMessage).toHaveBeenCalledWith(
            'Analyze my cashflow and list any upcoming bills that require attention or present a risk.'
        );

        component.runShortcut('anomalies');
        expect(mockAiService.sendMessage).toHaveBeenCalledWith(
            'Scan my recent transactions and identify any unusual spending spikes, double charges, or anomalies.'
        );

        component.runShortcut('categories');
        expect(mockAiService.sendMessage).toHaveBeenCalledWith(
            'Review my spending categories. Are there categories that seem redundant or could be consolidated for cleaner bookkeeping?'
        );

        component.runShortcut('budget');
        expect(mockAiService.sendMessage).toHaveBeenCalledWith(
            'Based on my recent income and expenses, suggest a realistic monthly budget allocation for my top spending categories.'
        );
    });

    it('exports chat to markdown and print document', () => {
        component.exportChatMarkdown();
        expect(mockExportService.exportConversationToMarkdown).toHaveBeenCalledWith(
            mockAiService.messages()
        );

        component.printChatReport();
        expect(mockExportService.printContent).toHaveBeenCalledWith(
            'AI Financial Advisory Transcript',
            expect.any(String),
            expect.any(String)
        );
    });

    it('exports individual message to markdown, pdf, and clipboard', async () => {
        const msg = mockMessages()[0]!;

        component.exportMessageMarkdown(msg);
        expect(mockExportService.exportMessageToMarkdown).toHaveBeenCalledWith(msg);

        component.printMessagePdf(msg);
        expect(mockExportService.printContent).toHaveBeenCalledWith(
            'AI Financial Analysis Report',
            expect.any(String),
            expect.any(String)
        );

        await component.copyMessage(msg);
        expect(mockExportService.copyToClipboard).toHaveBeenCalledWith(msg.text);
        expect(component.copiedMessage()).toBe(msg);
    });

    it('closes on outside document click when open', () => {
        mockIsOpen.set(true);
        fixture.detectChanges();

        const outsideEl = document.createElement('div');
        document.body.appendChild(outsideEl);

        component.onDocumentClick(outsideEl);
        expect(mockAiService.close).toHaveBeenCalled();

        document.body.removeChild(outsideEl);
    });

    it('does not close on document click if target is inside sidebar or header toggle', () => {
        mockIsOpen.set(true);
        fixture.detectChanges();

        // Click inside host
        component.onDocumentClick(fixture.nativeElement);
        expect(mockAiService.close).not.toHaveBeenCalled();

        // Click inside toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'ai-assistant-toggle';
        document.body.appendChild(toggleBtn);

        component.onDocumentClick(toggleBtn);
        expect(mockAiService.close).not.toHaveBeenCalled();

        document.body.removeChild(toggleBtn);
    });
});
