import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    viewChild,
    type ElementRef
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { Marked, type RendererObject, type Tokens } from 'marked';
import { MermaidService } from '../../../services/mermaid/mermaid.service';

@Component({
    selector: 'app-markdown-viewer',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div
            #contentContainer
            class="markdown-content text-xs leading-relaxed break-words"
            [innerHTML]="parsedHtml()"
        ></div>
    `,
    styles: [
        `
            :host {
                display: block;
                width: 100%;
            }
            :host ::ng-deep .markdown-content {
                font-size: 0.8125rem;
                line-height: 1.6;
                color: inherit;
            }
            :host ::ng-deep .markdown-content p {
                margin-bottom: 0.625rem;
            }
            :host ::ng-deep .markdown-content p:last-child {
                margin-bottom: 0;
            }
            :host ::ng-deep .markdown-content h1,
            :host ::ng-deep .markdown-content h2,
            :host ::ng-deep .markdown-content h3,
            :host ::ng-deep .markdown-content h4 {
                font-weight: 800;
                line-height: 1.3;
                margin-top: 1rem;
                margin-bottom: 0.375rem;
            }
            :host ::ng-deep .markdown-content h1 {
                font-size: 1.05rem;
                border-bottom: 1px solid var(--surface-200, #e2e8f0);
                padding-bottom: 0.25rem;
            }
            :host ::ng-deep .markdown-content h2 {
                font-size: 0.95rem;
                border-bottom: 1px solid var(--surface-200, #e2e8f0);
                padding-bottom: 0.2rem;
            }
            :host ::ng-deep .markdown-content h3 {
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                gap: 0.375rem;
            }
            :host ::ng-deep .markdown-content h3::before {
                content: '';
                display: inline-block;
                width: 3.5px;
                height: 13px;
                border-radius: 2px;
                background: linear-gradient(180deg, #3b82f6, #6366f1);
                flex-shrink: 0;
            }
            :host ::ng-deep .markdown-content ul {
                list-style-type: disc;
                margin: 0.5rem 0;
                padding-left: 1.25rem;
            }
            :host ::ng-deep .markdown-content ol {
                list-style-type: decimal;
                margin: 0.5rem 0;
                padding-left: 1.25rem;
            }
            :host ::ng-deep .markdown-content li {
                margin-bottom: 0.3125rem;
            }
            :host ::ng-deep .markdown-content ul li::marker {
                color: #3b82f6;
            }
            :host-context(.dark) ::ng-deep .markdown-content ul li::marker {
                color: #60a5fa;
            }
            :host ::ng-deep .markdown-content strong {
                font-weight: 700;
                color: var(--surface-900, #0f172a);
            }
            :host-context(.dark) ::ng-deep .markdown-content strong {
                color: var(--surface-100, #f8fafc);
            }
            :host ::ng-deep .markdown-content blockquote {
                border-left: 3px solid #3b82f6;
                background: linear-gradient(
                    to right,
                    rgba(59, 130, 246, 0.05),
                    rgba(99, 102, 241, 0.02)
                );
                border-radius: 0 0.5rem 0.5rem 0;
                padding: 0.5rem 0.75rem;
                margin: 0.625rem 0;
                font-style: italic;
                opacity: 0.9;
            }
            :host ::ng-deep .markdown-content table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 0.75rem;
                margin: 0.75rem 0;
                border-radius: 0.5rem;
                overflow: hidden;
                border: 1px solid rgba(226, 232, 240, 0.9);
                background-color: var(--surface-0, #ffffff);
            }
            :host-context(.dark) ::ng-deep .markdown-content table {
                border-color: rgba(51, 65, 85, 0.8);
                background-color: rgba(15, 23, 42, 0.5);
            }
            :host ::ng-deep .markdown-content th {
                padding: 0.5rem 0.625rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-size: 0.65rem;
                background: linear-gradient(
                    180deg,
                    rgba(239, 246, 255, 0.85) 0%,
                    rgba(241, 245, 249, 0.95) 100%
                );
                color: #1e40af;
                border-bottom: 2px solid rgba(59, 130, 246, 0.2);
            }
            :host-context(.dark) ::ng-deep .markdown-content th {
                background: linear-gradient(
                    180deg,
                    rgba(30, 41, 59, 0.9) 0%,
                    rgba(15, 23, 42, 0.9) 100%
                );
                color: #93c5fd;
                border-bottom-color: rgba(59, 130, 246, 0.3);
            }
            :host ::ng-deep .markdown-content td {
                padding: 0.45rem 0.625rem;
                border-bottom: 1px solid rgba(226, 232, 240, 0.7);
            }
            :host-context(.dark) ::ng-deep .markdown-content td {
                border-bottom-color: rgba(51, 65, 85, 0.5);
            }
            :host ::ng-deep .markdown-content tr:last-child td {
                border-bottom: none;
            }
            :host ::ng-deep .markdown-content tr:nth-child(even) td {
                background-color: rgba(248, 250, 252, 0.6);
            }
            :host-context(.dark) ::ng-deep .markdown-content tr:nth-child(even) td {
                background-color: rgba(30, 41, 59, 0.3);
            }
            :host ::ng-deep .markdown-content tr:hover td {
                background-color: rgba(239, 246, 255, 0.45);
            }
            :host-context(.dark) ::ng-deep .markdown-content tr:hover td {
                background-color: rgba(59, 130, 246, 0.1);
            }
            :host ::ng-deep .markdown-content code:not(pre code) {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 0.725rem;
                padding: 0.125rem 0.3rem;
                border-radius: 0.25rem;
                background-color: rgba(59, 130, 246, 0.08);
                color: #2563eb;
                border: 1px solid rgba(59, 130, 246, 0.18);
                font-weight: 500;
            }
            :host-context(.dark) ::ng-deep .markdown-content code:not(pre code) {
                background-color: rgba(59, 130, 246, 0.15);
                color: #93c5fd;
                border-color: rgba(59, 130, 246, 0.3);
            }
            :host ::ng-deep .markdown-content a {
                color: #2563eb;
                text-decoration: underline;
                text-underline-offset: 2px;
            }
            :host ::ng-deep .markdown-content hr {
                border: none;
                border-top: 1px solid rgba(0, 0, 0, 0.08);
                margin: 0.75rem 0;
            }
            :host ::ng-deep .mermaid-container {
                margin: 0.75rem 0;
                border-radius: 0.75rem;
                border: 1px solid rgba(226, 232, 240, 0.9);
                background: linear-gradient(180deg, #ffffff 0%, rgba(248, 250, 252, 0.85) 100%);
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
                overflow: hidden;
            }
            :host-context(.dark) ::ng-deep .mermaid-container {
                border-color: rgba(51, 65, 85, 0.8);
                background: linear-gradient(180deg, #0f172a 0%, rgba(15, 23, 42, 0.85) 100%);
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2);
            }
            :host ::ng-deep .mermaid-rendered svg {
                max-width: 100% !important;
                height: auto !important;
                display: block;
                margin: 0 auto;
            }
            :host ::ng-deep .mermaid-rendered svg .pieCircle {
                transition:
                    opacity 0.2s ease,
                    filter 0.2s ease;
                cursor: pointer;
            }
            :host ::ng-deep .mermaid-rendered svg .pieCircle:hover {
                filter: brightness(1.08);
                opacity: 0.95;
            }
        `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkdownViewerComponent {
    private readonly sanitizer = inject(DomSanitizer);
    private readonly mermaidService = inject(MermaidService);
    private readonly containerRef = viewChild<ElementRef<HTMLElement>>('contentContainer');

    readonly content = input.required<string>();
    readonly enableMermaid = input<boolean>(true);

    private readonly customRenderer: RendererObject = {
        code(token: Tokens.Code) {
            if (token.lang?.toLowerCase() === 'mermaid') {
                const encoded = encodeURIComponent(token.text);
                return `<div class="mermaid-container my-3 overflow-hidden rounded-lg border border-surface-200 bg-surface-0 shadow-sm" data-mermaid="${encoded}"><div class="mermaid-loading flex items-center justify-center p-4 text-xs text-surface-400 gap-2"><i class="pi pi-spin pi-spinner text-primary"></i><span>Rendering diagram...</span></div></div>`;
            }
            return false;
        }
    };

    readonly parsedHtml = computed<SafeHtml>(() => {
        const rawMarkdown = this.content() || '';
        try {
            // Configure marked instance with custom renderer
            const markedInstance = new Marked();
            markedInstance.use({ renderer: this.customRenderer });
            const rawHtml = markedInstance.parse(rawMarkdown, { async: false }) as string;

            // Secure sanitize output using DOMPurify
            const purify =
                typeof DOMPurify === 'function'
                    ? (DOMPurify as unknown as (w: Window) => typeof DOMPurify)(window)
                    : DOMPurify;

            const sanitized = purify.sanitize(rawHtml, {
                ADD_TAGS: ['use'],
                ADD_ATTR: ['data-mermaid'],
                USE_PROFILES: { html: true, svg: true }
            });

            return this.sanitizer.bypassSecurityTrustHtml(sanitized);
        } catch (err: unknown) {
            console.error('Failed to parse markdown:', err);
            return this.sanitizer.bypassSecurityTrustHtml(rawMarkdown);
        }
    });

    constructor() {
        effect(() => {
            // Trigger diagram rendering whenever content or enableMermaid changes
            this.content();
            this.enableMermaid();

            setTimeout(() => {
                void this.renderDiagrams();
            }, 50);
        });
    }

    async renderDiagrams(): Promise<void> {
        if (!this.enableMermaid()) return;

        const host = this.containerRef()?.nativeElement;
        if (!host) return;

        const containers = host.querySelectorAll<HTMLElement>(
            '.mermaid-container[data-mermaid]:not([data-rendered="true"])'
        );

        for (const container of Array.from(containers)) {
            const rawCode = decodeURIComponent(container.getAttribute('data-mermaid') || '');
            if (!rawCode.trim()) continue;

            const id = this.mermaidService.generateId();

            try {
                const svgString = await this.mermaidService.render(id, rawCode);
                const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
                const svgEl = doc.documentElement;
                svgEl.classList.add('max-w-full', 'h-auto', 'mx-auto');

                const wrapper = document.createElement('div');
                wrapper.className =
                    'mermaid-rendered overflow-x-auto p-3 flex justify-center bg-surface-0';
                wrapper.appendChild(svgEl);

                container.replaceChildren(wrapper);
                container.setAttribute('data-rendered', 'true');
            } catch (err: unknown) {
                console.warn('Failed to render Mermaid diagram:', err);
                const errMessage = err instanceof Error ? err.message : 'Invalid diagram syntax';

                const errorBox = document.createElement('div');
                errorBox.className =
                    'mermaid-error p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800';

                const title = document.createElement('div');
                title.className = 'flex items-center gap-1.5 font-bold mb-1 text-amber-900';
                title.innerHTML =
                    '<i class="pi pi-exclamation-triangle text-amber-600"></i> Diagram could not be rendered';

                const msg = document.createElement('div');
                msg.className = 'text-[11px] text-amber-700 mb-2';
                msg.textContent = errMessage;

                const pre = document.createElement('pre');
                pre.className =
                    'text-[10px] overflow-x-auto p-2 bg-surface-0/80 rounded border border-surface-200 font-mono text-surface-700';
                pre.textContent = rawCode;

                errorBox.appendChild(title);
                errorBox.appendChild(msg);
                errorBox.appendChild(pre);

                container.replaceChildren(errorBox);
                container.setAttribute('data-rendered', 'true');
            }
        }
    }
}
