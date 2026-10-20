import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ButtonDemoComponent, Gallery } from './button.stories';

describe('ButtonDemoComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<ButtonDemoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonDemoComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ButtonDemoComponent);
        fixture.detectChanges();
    });

    it('executes Gallery story interaction test', async () => {
        await Gallery.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Button Design System');
        expect(fixture.nativeElement.textContent).toContain('Severities');
        expect(fixture.nativeElement.textContent).toContain('Variants');
        expect(fixture.nativeElement.textContent).toContain('Sizes');
        expect(fixture.nativeElement.textContent).toContain('States & Features');
    });
});
