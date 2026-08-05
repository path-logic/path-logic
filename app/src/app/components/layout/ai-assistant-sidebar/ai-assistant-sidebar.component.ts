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
import { AiAssistantService } from '../../../services/ai-assistant/ai-assistant.service';
import { GeminiService } from '../../../services/gemini/gemini.service';

@Component({
    selector: 'ai-assistant-sidebar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './ai-assistant-sidebar.component.html',
    styleUrl: './ai-assistant-sidebar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiAssistantSidebarComponent {
    readonly aiService = inject(AiAssistantService);
    readonly geminiService = inject(GeminiService);
    private readonly elementRef = inject(ElementRef);

    readonly messageContainer = viewChild<ElementRef>('messageContainer');

    inputText = signal<string>('');

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

    runShortcut(action: 'cashflow' | 'anomalies' | 'categories' | 'budget'): void {
        let promptText = '';
        switch (action) {
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
