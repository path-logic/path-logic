import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MermaidService } from '../../../services/mermaid/mermaid.service';
import { MarkdownViewerComponent } from './markdown-viewer.component';
import {
    FinancialTable,
    MermaidFlowchart,
    MermaidPieChart,
    RichFormatting
} from './markdown-viewer.stories';

describe('MarkdownViewerComponent (Storybook Interaction Spec)', () => {
    let fixture: ComponentFixture<MarkdownViewerComponent>;

    const mockMermaidService = {
        generateId: () => 'story-spec-id',
        render: async (_id: string, _code: string) =>
            '<svg data-testid="mock-story-svg"><text>Chart</text></svg>'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MarkdownViewerComponent],
            providers: [{ provide: MermaidService, useValue: mockMermaidService }]
        }).compileComponents();

        fixture = TestBed.createComponent(MarkdownViewerComponent);
    });

    it('executes RichFormatting story play function', async () => {
        fixture.componentRef.setInput('content', RichFormatting.args?.content ?? '');
        fixture.detectChanges();

        await RichFormatting.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Executive Financial Brief');
    });

    it('executes FinancialTable story play function', async () => {
        fixture.componentRef.setInput('content', FinancialTable.args?.content ?? '');
        fixture.detectChanges();

        await FinancialTable.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Spending Breakdown by Category');
        expect(fixture.nativeElement.textContent).toContain('$2,100.00');
    });

    it('executes MermaidPieChart story play function', async () => {
        fixture.componentRef.setInput('content', MermaidPieChart.args?.content ?? '');
        fixture.detectChanges();

        await MermaidPieChart.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Category Allocation');
    });

    it('executes MermaidFlowchart story play function', async () => {
        fixture.componentRef.setInput('content', MermaidFlowchart.args?.content ?? '');
        fixture.detectChanges();

        await MermaidFlowchart.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Paycheck Allocation Flow');
    });
});
