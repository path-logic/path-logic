import { Component } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GlossaryTermComponent } from './glossary-term.component';

@Component({
    standalone: true,
    imports: [GlossaryTermComponent],
    template: ` <glossary-term term="reconciliation">mark as reconciled</glossary-term> `
})
class TestHostComponent {}

describe('GlossaryTermComponent', () => {
    let component: GlossaryTermComponent;
    let fixture: ComponentFixture<GlossaryTermComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GlossaryTermComponent, TestHostComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(GlossaryTermComponent);
        fixture.componentRef.setInput('term', 'reconciliation');
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        fixture.componentRef.setInput('term', 'reconciliation');
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    describe('Known Term Rendering and Accessibility', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('term', 'AES-GCM 256');
            fixture.detectChanges();
        });

        it('should resolve definition case-insensitively from glossary', () => {
            expect(component.definition()).toContain('Military-grade encryption');
        });

        it('should apply glossary-known class, button role, and tabindex 0', () => {
            const hostSpan = fixture.nativeElement.querySelector('.glossary-host');
            expect(hostSpan.classList.contains('glossary-known')).toBe(true);
            expect(hostSpan.getAttribute('tabindex')).toBe('0');
            expect(hostSpan.getAttribute('role')).toBe('button');
            expect(hostSpan.getAttribute('aria-label')).toBe(
                'AES-GCM 256: Military-grade encryption — your data is scrambled so only you can read it.'
            );
        });

        it('should render term text by default when no ng-content is provided', () => {
            const hostSpan = fixture.nativeElement.querySelector('.glossary-host');
            expect(hostSpan.textContent?.trim()).toBe('AES-GCM 256');
        });
    });

    describe('Unknown Term Handling', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('term', 'Unrecognized Term');
            fixture.detectChanges();
        });

        it('should set definition to null for unknown terms', () => {
            expect(component.definition()).toBeNull();
        });

        it('should omit interactive attributes for unknown terms', () => {
            const hostSpan = fixture.nativeElement.querySelector('.glossary-host');
            expect(hostSpan.classList.contains('glossary-known')).toBe(false);
            expect(hostSpan.getAttribute('tabindex')).toBeNull();
            expect(hostSpan.getAttribute('role')).toBeNull();
            expect(hostSpan.getAttribute('aria-label')).toBeNull();
        });

        it('should not show tooltip on show() for unknown terms', () => {
            component.show();
            fixture.detectChanges();

            expect(component.isVisible()).toBe(false);
            const tooltip = fixture.nativeElement.querySelector('.glossary-tooltip');
            expect(tooltip).toBeNull();
        });
    });

    describe('Custom Definition Override', () => {
        it('should prefer customDefinition input over glossary lookup', () => {
            fixture.componentRef.setInput('term', 'Custom Protocol');
            fixture.componentRef.setInput(
                'customDefinition',
                'Proprietary high-speed communication channel.'
            );
            fixture.detectChanges();

            expect(component.definition()).toBe('Proprietary high-speed communication channel.');

            component.show();
            fixture.detectChanges();

            const tooltip = fixture.nativeElement.querySelector('.glossary-tooltip');
            expect(tooltip).toBeTruthy();
            expect(tooltip.textContent?.trim()).toBe(
                'Proprietary high-speed communication channel.'
            );
        });
    });

    describe('Tooltip Triggers: Hover, Focus, and Keyboard Escape', () => {
        let hostSpan: HTMLElement;

        beforeEach(() => {
            fixture.componentRef.setInput('term', 'wasm sqlite');
            fixture.detectChanges();
            hostSpan = fixture.nativeElement.querySelector('.glossary-host');
        });

        it('should show on mouseenter and hide on mouseleave', () => {
            expect(component.isVisible()).toBe(false);

            hostSpan.dispatchEvent(new MouseEvent('mouseenter'));
            fixture.detectChanges();
            expect(component.isVisible()).toBe(true);
            let tooltip = fixture.nativeElement.querySelector('.glossary-tooltip');
            expect(tooltip).toBeTruthy();
            expect(tooltip.getAttribute('role')).toBe('tooltip');
            expect(tooltip.textContent?.trim()).toContain('A full database running privately');

            hostSpan.dispatchEvent(new MouseEvent('mouseleave'));
            fixture.detectChanges();
            expect(component.isVisible()).toBe(false);
            tooltip = fixture.nativeElement.querySelector('.glossary-tooltip');
            expect(tooltip).toBeNull();
        });

        it('should show on focus and hide on blur', () => {
            expect(component.isVisible()).toBe(false);

            hostSpan.dispatchEvent(new FocusEvent('focus'));
            fixture.detectChanges();
            expect(component.isVisible()).toBe(true);

            hostSpan.dispatchEvent(new FocusEvent('blur'));
            fixture.detectChanges();
            expect(component.isVisible()).toBe(false);
        });

        it('should hide tooltip on Escape keydown', () => {
            component.show();
            fixture.detectChanges();
            expect(component.isVisible()).toBe(true);

            component.onEscape();
            fixture.detectChanges();
            expect(component.isVisible()).toBe(false);
        });
    });

    describe('Content Projection', () => {
        it('should render projected content when provided', () => {
            const hostFixture = TestBed.createComponent(TestHostComponent);
            hostFixture.detectChanges();

            const element = hostFixture.nativeElement.querySelector('.glossary-host');
            expect(element.textContent).toContain('mark as reconciled');
        });
    });
});
