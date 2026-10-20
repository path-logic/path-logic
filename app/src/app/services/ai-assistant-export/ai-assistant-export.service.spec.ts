import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMessage } from '../ai-assistant/ai-assistant.service';
import { AiAssistantExportService } from './ai-assistant-export.service';

describe('AiAssistantExportService', () => {
    let service: AiAssistantExportService;

    const mockMessage: IMessage = {
        sender: 'assistant',
        text: '### Spending Summary\n| Category | Amount |\n| --- | --- |\n| Food | $500 |',
        timestamp: new Date('2026-10-19T10:00:00Z')
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AiAssistantExportService]
        });
        service = TestBed.inject(AiAssistantExportService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('formats a single message markdown correctly', () => {
        const md = service.formatMessageAsMarkdown(mockMessage);
        expect(md).toContain('# Path Logic — AI Financial Report');
        expect(md).toContain('### Spending Summary');
        expect(md).toContain('| Category | Amount |');
    });

    it('formats entire conversation markdown correctly', () => {
        const messages: Array<IMessage> = [
            {
                sender: 'user',
                text: 'Show my expenses',
                timestamp: new Date('2026-10-19T09:59:00Z')
            },
            mockMessage
        ];
        const md = service.formatConversationAsMarkdown(messages);
        expect(md).toContain('# Path Logic — AI Financial Advisory Session');
        expect(md).toContain('### User');
        expect(md).toContain('Show my expenses');
        expect(md).toContain('### AI Financial Assistant');
        expect(md).toContain('Spending Summary');
    });

    it('triggers download for markdown', () => {
        const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
        const revokeObjectURLSpy = vi.fn();
        globalThis.URL.createObjectURL = createObjectURLSpy;
        globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        service.exportMessageToMarkdown(mockMessage, 'test-report.md');
        expect(createObjectURLSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalled();
        clickSpy.mockRestore();
    });

    it('copies markdown to clipboard', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock
            }
        });

        const success = await service.copyToClipboard('Hello markdown');
        expect(writeTextMock).toHaveBeenCalledWith('Hello markdown');
        expect(success).toBe(true);
    });

    it('generates clean printable HTML document', () => {
        const html = service.buildPrintDocumentHtml({
            title: 'Financial Analysis',
            contentHtml: '<p>Analysis text</p><svg><text>Chart</text></svg>'
        });

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Path Logic');
        expect(html).toContain('Financial Analysis');
        expect(html).toContain('<p>Analysis text</p>');
        expect(html).toContain('@media print');
    });
});
