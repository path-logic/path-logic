import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityOverlayComponent } from './security-overlay.component';

describe('SecurityOverlayComponent', () => {
    let component: SecurityOverlayComponent;
    let fixture: ComponentFixture<SecurityOverlayComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SecurityOverlayComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(SecurityOverlayComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        fixture.componentRef.setInput('isVisible', false);
        fixture.detectChanges();

        expect(component).toBeTruthy();
        expect(component.isVisible()).toBe(false);
    });

    it('should have accessibility region role and aria-label', () => {
        fixture.componentRef.setInput('isVisible', true);
        fixture.detectChanges();

        const container = fixture.nativeElement.querySelector('div[role="region"]');
        expect(container).toBeTruthy();
        expect(container.getAttribute('aria-label')).toBe('Session Paused Lock Screen');
    });

    it('should apply active visibility classes when isVisible is true', () => {
        fixture.componentRef.setInput('isVisible', true);
        fixture.detectChanges();

        const container = fixture.nativeElement.firstElementChild as HTMLElement;
        expect(container.classList.contains('opacity-100')).toBe(true);
        expect(container.classList.contains('pointer-events-auto')).toBe(true);

        const card = container.querySelector('.sm\\:max-w-md') as HTMLElement;
        expect(card).toBeTruthy();
        expect(card.classList.contains('opacity-100')).toBe(true);
        expect(card.classList.contains('sm:scale-100')).toBe(true);
        expect(card.classList.contains('sm:translate-y-0')).toBe(true);
    });

    it('should not apply active visibility classes when isVisible is false', () => {
        fixture.componentRef.setInput('isVisible', false);
        fixture.detectChanges();

        const container = fixture.nativeElement.firstElementChild as HTMLElement;
        expect(container.classList.contains('opacity-100')).toBe(false);
        expect(container.classList.contains('pointer-events-auto')).toBe(false);

        const card = container.querySelector('.sm\\:max-w-md') as HTMLElement;
        expect(card).toBeTruthy();
        expect(card.classList.contains('opacity-100')).toBe(false);
        expect(card.classList.contains('sm:scale-100')).toBe(false);
        expect(card.classList.contains('sm:translate-y-0')).toBe(false);
    });

    it('should display lock icon, session paused title, and security reassurance text', () => {
        fixture.componentRef.setInput('isVisible', true);
        fixture.detectChanges();

        const textContent = fixture.nativeElement.textContent;
        expect(textContent).toContain('Session Paused');
        expect(textContent).toContain(
            'Your session has been paused due to inactivity to protect your local financial data.'
        );
        expect(textContent).toContain('Resume Session');
        expect(textContent).toContain('Secure Local-First Environment');

        const lockIcon = fixture.nativeElement.querySelector('.pi-lock');
        expect(lockIcon).toBeTruthy();

        const shieldIcon = fixture.nativeElement.querySelector('.pi-shield');
        expect(shieldIcon).toBeTruthy();
    });

    it('should emit unlocked output when Resume Session button is clicked', () => {
        fixture.componentRef.setInput('isVisible', true);
        fixture.detectChanges();

        const emitSpy = vi.fn();
        component.unlocked.subscribe(emitSpy);

        const button = fixture.nativeElement.querySelector(
            'button[aria-label="Resume Session"]'
        ) as HTMLButtonElement;
        expect(button).toBeTruthy();

        button.click();
        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});
