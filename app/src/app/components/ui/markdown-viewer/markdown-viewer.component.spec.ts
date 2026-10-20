import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidService } from '../../../services/mermaid/mermaid.service';
import { MarkdownViewerComponent } from './markdown-viewer.component';

describe('MarkdownViewerComponent', () => {
    let fixture: ComponentFixture<MarkdownViewerComponent>;
    let component: MarkdownViewerComponent;

    const mockMermaidService = {
        generateId: vi.fn().mockReturnValue('mermaid-test-id'),
        render: vi.fn().mockResolvedValue('<svg id="mock-mermaid-svg"><text>Chart</text></svg>')
    };

    beforeEach(async () => {
        mockMermaidService.render.mockClear();
        mockMermaidService.generateId.mockClear();

        await TestBed.configureTestingModule({
            imports: [MarkdownViewerComponent],
            providers: [{ provide: MermaidService, useValue: mockMermaidService }]
        }).compileComponents();

        fixture = TestBed.createComponent(MarkdownViewerComponent);
        component = fixture.componentInstance;
    });

    it('creates the markdown viewer component', () => {
        fixture.componentRef.setInput('content', 'Hello World');
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('renders basic markdown elements: bold, italic, headings', () => {
        fixture.componentRef.setInput(
            'content',
            '# Heading 1\n## Heading 2\n**Bold Text** and *Italic Text*'
        );
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h1')?.textContent).toContain('Heading 1');
        expect(compiled.querySelector('h2')?.textContent).toContain('Heading 2');
        expect(compiled.querySelector('strong')?.textContent).toContain('Bold Text');
        expect(compiled.querySelector('em')?.textContent).toContain('Italic Text');
    });

    it('renders markdown tables correctly', () => {
        const tableMd = `
| Category | Outflow |
| :--- | :--- |
| **Housing** | $1,850.00 |
| **Groceries** | $450.00 |
`;
        fixture.componentRef.setInput('content', tableMd);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const table = compiled.querySelector('table');
        expect(table).not.toBeNull();
        expect(table?.textContent).toContain('Category');
        expect(table?.textContent).toContain('Housing');
        expect(table?.textContent).toContain('$1,850.00');
    });

    it('sanitizes malicious script tags to prevent XSS', () => {
        fixture.componentRef.setInput(
            'content',
            'Safe text <script>alert("hacked")</script> <img src=x onerror=alert(1)>'
        );
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('script')).toBeNull();
        const img = compiled.querySelector('img');
        if (img) {
            expect(img.getAttribute('onerror')).toBeNull();
        }
    });

    it('renders mermaid diagram when code block has mermaid language', async () => {
        const mermaidCode = 'pie title Top Categories\n"Housing" : 50\n"Food" : 50';
        fixture.componentRef.setInput('content', `\`\`\`mermaid\n${mermaidCode}\n\`\`\``);
        fixture.detectChanges();

        // Trigger diagram render
        await component.renderDiagrams();
        fixture.detectChanges();

        expect(mockMermaidService.render).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('pie title Top Categories')
        );
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('svg')).not.toBeNull();
    });

    it('handles mermaid diagram syntax error gracefully without crashing', async () => {
        mockMermaidService.render.mockRejectedValueOnce(new Error('Mermaid syntax error'));
        fixture.componentRef.setInput('content', '```mermaid\nbad syntax\n```');
        fixture.detectChanges();

        await component.renderDiagrams();
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Diagram could not be rendered');
        expect(compiled.textContent).toContain('bad syntax');
    });
});
