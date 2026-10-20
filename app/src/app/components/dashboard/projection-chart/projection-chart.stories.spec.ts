import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProjectionChartComponent } from './projection-chart.component';
import { EmptyState, TrendingDown, TrendingUp } from './projection-chart.component.stories';

describe('ProjectionChartComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ProjectionChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProjectionChartComponent]
        }).compileComponents();
    });

    it('executes TrendingUp story interaction test', async () => {
        fixture = TestBed.createComponent(ProjectionChartComponent);
        fixture.componentRef.setInput('data', TrendingUp.args?.data ?? []);
        fixture.componentRef.setInput('height', TrendingUp.args?.height ?? 250);
        fixture.componentRef.setInput('className', TrendingUp.args?.className ?? '');
        fixture.detectChanges();

        await TrendingUp.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('90-Day Cashflow Forecast');
        expect(fixture.nativeElement.textContent).toContain('↑ +');
    });

    it('executes TrendingDown story interaction test', async () => {
        fixture = TestBed.createComponent(ProjectionChartComponent);
        fixture.componentRef.setInput('data', TrendingDown.args?.data ?? []);
        fixture.componentRef.setInput('height', TrendingDown.args?.height ?? 250);
        fixture.componentRef.setInput('className', TrendingDown.args?.className ?? '');
        fixture.detectChanges();

        await TrendingDown.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('90-Day Cashflow Forecast');
        expect(fixture.nativeElement.textContent).toContain('↓ ');
    });

    it('executes EmptyState story interaction test', async () => {
        fixture = TestBed.createComponent(ProjectionChartComponent);
        fixture.componentRef.setInput('data', EmptyState.args?.data ?? []);
        fixture.componentRef.setInput('height', EmptyState.args?.height ?? 250);
        fixture.componentRef.setInput('className', EmptyState.args?.className ?? '');
        fixture.detectChanges();

        await EmptyState.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('No projection data available');
    });
});
