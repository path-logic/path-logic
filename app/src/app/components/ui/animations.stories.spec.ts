import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AnimationDemoComponent, Gallery } from './animations.stories';

describe('AnimationDemoComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<AnimationDemoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AnimationDemoComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(AnimationDemoComponent);
        fixture.detectChanges();
    });

    it('executes Gallery story interaction test', async () => {
        await Gallery.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Animation Design System');
        expect(fixture.nativeElement.textContent).toContain('Duration Scale');
        expect(fixture.nativeElement.textContent).toContain('Easing Curves');
    });
});
