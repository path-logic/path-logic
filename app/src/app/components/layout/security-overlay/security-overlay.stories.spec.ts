import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SecurityOverlayComponent } from './security-overlay.component';
import { Visible } from './security-overlay.component.stories';

describe('SecurityOverlayComponent (Storybook Interaction Spec Wrapper)', () => {
    it('executes Visible story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [SecurityOverlayComponent]
        }).compileComponents();

        const fixture: ComponentFixture<SecurityOverlayComponent> =
            TestBed.createComponent(SecurityOverlayComponent);
        fixture.componentRef.setInput('isVisible', true);
        fixture.detectChanges();

        await Visible.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Session Paused');
    });
});
