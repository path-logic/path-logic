import { Injectable } from '@angular/core';
import type { IMessage } from '../ai-assistant/ai-assistant.service';

export interface IPrintDocumentOptions {
    title: string;
    contentHtml: string;
    subtitle?: string | undefined;
    timestamp?: Date | undefined;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantExportService {
    formatMessageAsMarkdown(message: IMessage): string {
        const timeStr = message.timestamp.toLocaleString();
        return `# Path Logic — AI Financial Report
**Generated:** ${timeStr}  
**Sender:** ${message.sender === 'user' ? 'User' : 'AI Financial Assistant'}

---

${message.text}
`;
    }

    formatConversationAsMarkdown(messages: Array<IMessage>): string {
        const timeStr = new Date().toLocaleString();
        let md = `# Path Logic — AI Financial Advisory Session
**Generated:** ${timeStr}  
**Total Messages:** ${messages.length}

---
`;

        for (const msg of messages) {
            const senderName = msg.sender === 'user' ? 'User' : 'AI Financial Assistant';
            const msgTime = new Date(msg.timestamp).toLocaleTimeString();
            md += `\n### ${senderName} (${msgTime})\n\n${msg.text}\n\n---\n`;
        }

        return md;
    }

    exportMessageToMarkdown(message: IMessage, filename?: string): void {
        const md = this.formatMessageAsMarkdown(message);
        const name =
            filename ||
            `path-logic-ai-report-${this.getTimestampForFilename(message.timestamp)}.md`;
        this.downloadFile(md, name, 'text/markdown;charset=utf-8');
    }

    exportConversationToMarkdown(messages: Array<IMessage>, filename?: string): void {
        const md = this.formatConversationAsMarkdown(messages);
        const name =
            filename || `path-logic-ai-chat-${this.getTimestampForFilename(new Date())}.md`;
        this.downloadFile(md, name, 'text/markdown;charset=utf-8');
    }

    async copyToClipboard(text: string): Promise<boolean> {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            return false;
        } catch (err: unknown) {
            console.error('Failed to copy to clipboard', err);
            return false;
        }
    }

    buildPrintDocumentHtml(options: IPrintDocumentOptions): string {
        const dateStr = (options.timestamp || new Date()).toLocaleString();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title} — Path Logic</title>
    <style>
        :root {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.5;
        }
        @page {
            margin: 1.5cm;
            size: letter;
        }
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
        }
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .header .meta {
            font-size: 11px;
            color: #6b7280;
            text-align: right;
        }
        .content {
            font-size: 13px;
        }
        h1, h2, h3, h4 {
            color: #1f2937;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
            font-weight: 700;
        }
        h2 { font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        h3 { font-size: 14px; }
        p { margin: 0 0 1em 0; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 12px;
            page-break-inside: avoid;
        }
        th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
        }
        th {
            background-color: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        svg {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 16px auto;
            page-break-inside: avoid;
        }
        .mermaid-chart {
            margin: 20px 0;
            page-break-inside: avoid;
            text-align: center;
        }
        ul, ol {
            padding-left: 20px;
            margin: 0 0 1em 0;
        }
        li { margin-bottom: 4px; }
        blockquote {
            border-left: 3px solid #2563eb;
            margin: 12px 0;
            padding-left: 12px;
            color: #4b5563;
            font-style: italic;
        }
        code {
            background: #f3f4f6;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
        }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Path Logic</h1>
            <div style="font-size: 12px; color: #4b5563; font-weight: 600;">${options.title}</div>
            ${options.subtitle ? `<div style="font-size: 11px; color: #6b7280;">${options.subtitle}</div>` : ''}
        </div>
        <div class="meta">
            <div><strong>Report Date:</strong> ${dateStr}</div>
            <div>Local-First Financial Intelligence</div>
        </div>
    </div>
    <div class="content">
        ${options.contentHtml}
    </div>
    <div class="footer">
        Generated by Path Logic AI Financial Assistant • Confidential Personal Financial Report
    </div>
</body>
</html>`;
    }

    printContent(title: string, contentHtml: string, subtitle?: string): void {
        const fullHtml = this.buildPrintDocumentHtml({
            title,
            contentHtml,
            subtitle
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            console.warn('Popup blocked: cannot open print window');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();

        // Allow images/SVGs to layout, then trigger print
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    }

    private downloadFile(content: string, filename: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    private getTimestampForFilename(d: Date): string {
        const pad = (n: number): string => n.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const mins = pad(d.getMinutes());
        return `${year}-${month}-${day}-${hours}${mins}`;
    }
}
