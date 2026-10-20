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
import {
    Collapsed,
    LoadingState,
    MermaidTestMessages,
    OpenWithMessages,
    WithMermaidDiagram
} from './ai-assistant-sidebar.component.stories';

describe('AiAssistantSidebarComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<AiAssistantSidebarComponent>;

    const mockIsOpen = signal<boolean>(true);
    const mockMessages = signal<Array<IMessage>>([
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
    ]);
    const mockIsSending = signal<boolean>(false);
    const mockSendMessage = vi.fn().mockResolvedValue(undefined);

    const mockAiService = {
        isOpen: mockIsOpen,
        messages: mockMessages,
        isSending: mockIsSending,
        toggle: vi.fn(() => mockIsOpen.update(v => !v)),
        open: vi.fn(() => mockIsOpen.set(true)),
        close: vi.fn(() => mockIsOpen.set(false)),
        clearChat: vi.fn(),
        sendMessage: mockSendMessage
    };

    const mockGeminiService = {
        hasKey: vi.fn().mockReturnValue(true),
        apiKey: vi.fn().mockReturnValue('mock-gemini-key')
    };

    const mockExportService = {
        exportMessageToMarkdown: vi.fn(),
        exportConversationToMarkdown: vi.fn(),
        printContent: vi.fn(),
        copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    const mockMermaidService = {
        generateId: () => 'story-mermaid-id',
        render: async () => '<svg><text>Mock Chart</text></svg>'
    };

    beforeEach(async () => {
        mockIsOpen.set(true);
        mockIsSending.set(false);
        mockSendMessage.mockClear();

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
        fixture.detectChanges();
    });

    it('executes Collapsed story interaction test', async () => {
        mockIsOpen.set(false);
        fixture.detectChanges();

        await Collapsed.play?.({ canvasElement: fixture.nativeElement } as any);
        const rootDiv = fixture.nativeElement.firstElementChild as HTMLElement;
        expect(rootDiv.classList.contains('translate-x-full')).toBe(true);
    });

    it('executes OpenWithMessages story interaction test', async () => {
        mockIsOpen.set(true);
        mockIsSending.set(false);
        fixture.detectChanges();

        await OpenWithMessages.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(mockSendMessage).toHaveBeenCalledWith('Suggest a realistic budget');
    });

    it('executes WithMermaidDiagram story interaction test', async () => {
        mockIsOpen.set(true);
        mockIsSending.set(false);
        mockMessages.set(MermaidTestMessages);
        fixture.detectChanges();

        await WithMermaidDiagram.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('AI Financial Assistant');
    });

    it('executes LoadingState story interaction test', async () => {
        mockIsOpen.set(true);
        mockIsSending.set(true);
        fixture.detectChanges();

        await LoadingState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Thinking...');
    });
});
