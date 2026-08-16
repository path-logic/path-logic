import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BrandLogoComponent } from './brand-logo.component';

describe('BrandLogoComponent', () => {
    let fixture: ComponentFixture<BrandLogoComponent>;
    let component: BrandLogoComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BrandLogoComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(BrandLogoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the brand logo component', () => {
        expect(component).toBeTruthy();
    });

    it('should render the stylized SVG logo mark', () => {
        const svg = fixture.nativeElement.querySelector('svg');
        expect(svg).toBeTruthy();
    });

    it('should render the PATH LOGIC wordmark in full variant', () => {
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('PATH');
        expect(text).toContain('LOGIC');
    });

    it('should hide the wordmark when variant is icon-only', () => {
        fixture.componentRef.setInput('variant', 'icon-only');
        fixture.detectChanges();

        const wordmark = fixture.nativeElement.querySelector('.brand-wordmark');
        expect(wordmark).toBeFalsy();
    });

    it('should apply size classes based on size input', () => {
        fixture.componentRef.setInput('size', 'lg');
        fixture.detectChanges();

        const badge = fixture.nativeElement.querySelector('.brand-badge');
        expect(badge.classList.contains('w-12')).toBe(true);
        expect(badge.classList.contains('h-12')).toBe(true);

        fixture.componentRef.setInput('size', 'sm');
        fixture.detectChanges();
        expect(badge.classList.contains('w-5')).toBe(true);
    });

    it('should apply environment theme colors correctly', () => {
        fixture.componentRef.setInput('env', 'dev');
        fixture.detectChanges();
        let el = fixture.nativeElement.querySelector('circle');
        expect(el.getAttribute('fill')).toBe('#3b82f6');

        fixture.componentRef.setInput('env', 'staging');
        fixture.detectChanges();
        el = fixture.nativeElement.querySelector('circle');
        expect(el.getAttribute('fill')).toBe('#f97316');

        fixture.componentRef.setInput('env', 'prod');
        fixture.detectChanges();
        el = fixture.nativeElement.querySelector('circle');
        expect(el.getAttribute('fill')).toBe('#a855f7');
    });

    it('should default to active environment theme favicon color when env and color are not specified', () => {
        const circle = fixture.nativeElement.querySelector('circle');
        expect(circle.getAttribute('fill')).toBeTruthy();
    });

    it('should use custom color when color input is provided', () => {
        fixture.componentRef.setInput('color', '#123456');
        fixture.detectChanges();
        const circle = fixture.nativeElement.querySelector('circle');
        expect(circle.getAttribute('fill')).toBe('#123456');
    });

    it('should apply stacked layout classes when variant is stacked', () => {
        fixture.componentRef.setInput('variant', 'stacked');
        fixture.detectChanges();

        const container = fixture.nativeElement.querySelector('[aria-label="Path Logic"]');
        expect(container.classList.contains('flex-col')).toBe(true);
    });
});
