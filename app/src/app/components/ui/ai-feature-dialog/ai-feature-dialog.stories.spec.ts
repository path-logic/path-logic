import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiFeatureDialogComponent } from './ai-feature-dialog.component';
import {
    Default,
    InteractionTest,
    WithoutOfflineFallback
} from './ai-feature-dialog.component.stories';

describe('AiFeatureDialogComponent (Storybook Interactions)', () => {
    let fixture: ComponentFixture<AiFeatureDialogComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AiFeatureDialogComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(AiFeatureDialogComponent);
    });

    afterEach(() => {
        fixture.destroy();
        // Clean up any dialog nodes appended to document.body
        const dialogNodes = document.body.querySelectorAll('.p-dialog, .p-component-overlay');
        dialogNodes.forEach(node => node.remove());
    });

    it('should render Default story correctly in document.body', () => {
        const comp = fixture.componentInstance;
        comp.visible.set(true);
        fixture.componentRef.setInput(
            'featureName',
            Default.args?.featureName ?? 'AI Recurring Pattern Discovery'
        );
        fixture.detectChanges();

        expect(document.body.textContent).toContain('AI Recurring Pattern Discovery');
    });

    it('should render WithoutOfflineFallback story without offline button', () => {
        const comp = fixture.componentInstance;
        comp.visible.set(true);
        fixture.componentRef.setInput(
            'featureName',
            WithoutOfflineFallback.args?.featureName ?? 'AI Merchant Auto-Categorization'
        );
        fixture.componentRef.setInput('canRunOffline', false);
        fixture.detectChanges();

        expect(document.body.textContent).toContain('AI Merchant Auto-Categorization');
        expect(document.body.textContent).not.toContain('Run Offline Analysis');
    }, 15000);

    it('should execute InteractionTest play function', async () => {
        const comp = fixture.componentInstance;
        comp.visible.set(true);
        fixture.componentRef.setInput('featureName', 'AI Recurring Pattern Discovery');
        fixture.componentRef.setInput('canRunOffline', true);
        const offlineFn = vi.fn();
        comp.runOffline.subscribe(offlineFn);

        fixture.detectChanges();

        await (InteractionTest as any).play({
            canvasElement: fixture.nativeElement,
            args: { runOffline: offlineFn }
        });

        expect(offlineFn).toHaveBeenCalled();
    });
});
