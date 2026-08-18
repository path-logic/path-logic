import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EnvBannerComponent } from './env-banner.component';

describe('EnvBannerComponent', () => {
    let fixture: ComponentFixture<EnvBannerComponent>;
    let component: EnvBannerComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnvBannerComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(EnvBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the env banner component', () => {
        expect(component).toBeTruthy();
    });

    it('should render the corner tag and SVG when not in production', () => {
        if (!component.isProd) {
            const tag = fixture.nativeElement.querySelector('.env-corner-tag');
            const svg = fixture.nativeElement.querySelector('.env-corner-svg');
            const polygon = fixture.nativeElement.querySelector('polygon');
            const text = fixture.nativeElement.querySelector('.env-text');

            expect(tag).toBeTruthy();
            expect(svg).toBeTruthy();
            expect(polygon).toBeTruthy();
            expect(polygon.getAttribute('points')).toBe('0,0 80,0 80,80');
            expect(text.textContent.trim()).toBe(component.envLabel);
        } else {
            const tag = fixture.nativeElement.querySelector('.env-corner-tag');
            expect(tag).toBeNull();
        }
    });

    it('should have pointer-events none to avoid obstructing clicks', () => {
        if (!component.isProd) {
            const tag = fixture.nativeElement.querySelector('.env-corner-tag');
            expect(tag).toBeTruthy();
        }
    });
});
