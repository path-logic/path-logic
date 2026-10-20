import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    HostListener,
    inject,
    signal,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import { AiAssistantExportService } from '../../../services/ai-assistant-export/ai-assistant-export.service';
import {
    AiAssistantService,
    type IMessage
} from '../../../services/ai-assistant/ai-assistant.service';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { MarkdownViewerComponent } from '../../ui/markdown-viewer/markdown-viewer.component';

@Component({
    selector: 'ai-assistant-sidebar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, MarkdownViewerComponent],
    templateUrl: './ai-assistant-sidebar.component.html',
    styleUrl: './ai-assistant-sidebar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiAssistantSidebarComponent {
    readonly aiService = inject(AiAssistantService);
    readonly geminiService = inject(GeminiService);
    readonly exportService = inject(AiAssistantExportService);
    private readonly elementRef = inject(ElementRef);

    readonly messageContainer = viewChild<ElementRef<HTMLElement>>('messageContainer');

    readonly inputText = signal<string>('');
    readonly copiedMessage = signal<IMessage | null>(null);

    constructor() {
        // Auto-scroll to bottom of chat container when a new message is added
        effect(() => {
            const container = this.messageContainer()?.nativeElement;
            this.aiService.messages();
            if (container) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 50);
            }
        });
    }

    async handleSend(): Promise<void> {
        const text = this.inputText().trim();
        if (!text) return;

        this.inputText.set('');
        await this.aiService.sendMessage(text);
    }

    onKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            void this.handleSend();
        }
    }

    runShortcut(action: 'cashflow' | 'anomalies' | 'categories' | 'budget' | 'chart'): void {
        let promptText = '';
        switch (action) {
            case 'chart':
                promptText =
                    'Provide a visual category breakdown of my top spending categories over the last 60 days using a Mermaid pie chart and a detailed Markdown table.';
                break;
            case 'cashflow':
                promptText =
                    'Analyze my cashflow and list any upcoming bills that require attention or present a risk.';
                break;
            case 'anomalies':
                promptText =
                    'Scan my recent transactions and identify any unusual spending spikes, double charges, or anomalies.';
                break;
            case 'categories':
                promptText =
                    'Review my spending categories. Are there categories that seem redundant or could be consolidated for cleaner bookkeeping?';
                break;
            case 'budget':
                promptText =
                    'Based on my recent income and expenses, suggest a realistic monthly budget allocation for my top spending categories.';
                break;
        }

        if (promptText) {
            void this.aiService.sendMessage(promptText);
        }
    }

    exportMessageMarkdown(msg: IMessage): void {
        this.exportService.exportMessageToMarkdown(msg);
    }

    printMessagePdf(msg: IMessage, msgElement?: HTMLElement): void {
        const contentHtml =
            msgElement?.querySelector('.markdown-content')?.innerHTML ||
            this.formatMarkdownToHtml(msg.text);

        this.exportService.printContent(
            'AI Financial Analysis Report',
            contentHtml,
            msg.timestamp.toLocaleString()
        );
    }

    async copyMessage(msg: IMessage): Promise<void> {
        const ok = await this.exportService.copyToClipboard(msg.text);
        if (ok) {
            this.copiedMessage.set(msg);
            setTimeout(() => {
                if (this.copiedMessage() === msg) {
                    this.copiedMessage.set(null);
                }
            }, 2000);
        }
    }

    exportChatMarkdown(): void {
        this.exportService.exportConversationToMarkdown(this.aiService.messages());
    }

    printChatReport(): void {
        const messages = this.aiService.messages();
        let contentHtml = '';
        for (const msg of messages) {
            const sender = msg.sender === 'user' ? 'User' : 'AI Financial Assistant';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            contentHtml += `<div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 11px; font-weight: 700; color: #4b5563; margin-bottom: 6px;">${sender} — ${time}</div>
                <div>${this.formatMarkdownToHtml(msg.text)}</div>
            </div>`;
        }

        this.exportService.printContent(
            'AI Financial Advisory Transcript',
            contentHtml,
            new Date().toLocaleString()
        );
    }

    private formatMarkdownToHtml(markdown: string): string {
        try {
            const markedInstance = new Marked();
            const raw = markedInstance.parse(markdown, { async: false }) as string;
            const purify =
                typeof DOMPurify === 'function'
                    ? (DOMPurify as unknown as (w: Window) => typeof DOMPurify)(window)
                    : DOMPurify;
            return purify.sanitize(raw);
        } catch {
            return markdown;
        }
    }

    @HostListener('document:click', ['$event?.target'])
    onDocumentClick(target: EventTarget | null | undefined): void {
        const host = this.elementRef.nativeElement;
        // Close the sidebar if clicking outside of the sidebar OR the header sparkles button
        const isHeaderButton = (target as HTMLElement)?.closest('.ai-assistant-toggle');
        if (
            this.aiService.isOpen() &&
            target &&
            !host.contains(target as Node) &&
            !isHeaderButton
        ) {
            this.aiService.close();
        }
    }
}
