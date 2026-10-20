import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { BrandLogoComponent } from './brand-logo.component';
import {
    Default,
    DevEnvironment,
    IconOnly,
    Large,
    ProdEnvironment,
    Small,
    Stacked,
    StagingEnvironment
} from './brand-logo.component.stories';

describe('BrandLogoComponent (Storybook Stories)', () => {
    let fixture: ComponentFixture<BrandLogoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BrandLogoComponent]
        }).compileComponents();
    });

    it('executes Default story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', Default.args?.size ?? 'md');
        fixture.componentRef.setInput('variant', Default.args?.variant ?? 'full');
        fixture.detectChanges();

        await Default.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('PATH');
        expect(fixture.nativeElement.textContent).toContain('LOGIC');
    });

    it('executes Small story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', Small.args?.size ?? 'sm');
        fixture.componentRef.setInput('variant', Small.args?.variant ?? 'full');
        fixture.detectChanges();

        await Small.play?.({ canvasElement: fixture.nativeElement } as any);
        const badge = fixture.nativeElement.querySelector('.brand-badge');
        expect(badge?.classList.contains('w-5')).toBe(true);
    });

    it('executes Large story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', Large.args?.size ?? 'lg');
        fixture.componentRef.setInput('variant', Large.args?.variant ?? 'full');
        fixture.detectChanges();

        await Large.play?.({ canvasElement: fixture.nativeElement } as any);
        const badge = fixture.nativeElement.querySelector('.brand-badge');
        expect(badge?.classList.contains('w-12')).toBe(true);
    });

    it('executes IconOnly story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', IconOnly.args?.size ?? 'md');
        fixture.componentRef.setInput('variant', IconOnly.args?.variant ?? 'icon-only');
        fixture.detectChanges();

        await IconOnly.play?.({ canvasElement: fixture.nativeElement } as any);
        const wordmark = fixture.nativeElement.querySelector('.brand-wordmark');
        expect(wordmark).toBeFalsy();
    });

    it('executes Stacked story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', Stacked.args?.size ?? 'lg');
        fixture.componentRef.setInput('variant', Stacked.args?.variant ?? 'stacked');
        fixture.detectChanges();

        await Stacked.play?.({ canvasElement: fixture.nativeElement } as any);
        const container = fixture.nativeElement.querySelector('[aria-label="Path Logic"]');
        expect(container?.classList.contains('flex-col')).toBe(true);
    });

    it('executes DevEnvironment story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', DevEnvironment.args?.size ?? 'md');
        fixture.componentRef.setInput('variant', DevEnvironment.args?.variant ?? 'full');
        fixture.componentRef.setInput('env', DevEnvironment.args?.env ?? 'dev');
        fixture.detectChanges();

        await DevEnvironment.play?.({ canvasElement: fixture.nativeElement } as any);
        const circle = fixture.nativeElement.querySelector('circle');
        expect(circle?.getAttribute('fill')).toBe('#3b82f6');
    });

    it('executes StagingEnvironment story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', StagingEnvironment.args?.size ?? 'md');
        fixture.componentRef.setInput('variant', StagingEnvironment.args?.variant ?? 'full');
        fixture.componentRef.setInput('env', StagingEnvironment.args?.env ?? 'staging');
        fixture.detectChanges();

        await StagingEnvironment.play?.({ canvasElement: fixture.nativeElement } as any);
        const circle = fixture.nativeElement.querySelector('circle');
        expect(circle?.getAttribute('fill')).toBe('#f97316');
    });

    it('executes ProdEnvironment story interaction test', async () => {
        fixture = TestBed.createComponent(BrandLogoComponent);
        fixture.componentRef.setInput('size', ProdEnvironment.args?.size ?? 'md');
        fixture.componentRef.setInput('variant', ProdEnvironment.args?.variant ?? 'full');
        fixture.componentRef.setInput('env', ProdEnvironment.args?.env ?? 'prod');
        fixture.detectChanges();

        await ProdEnvironment.play?.({ canvasElement: fixture.nativeElement } as any);
        const circle = fixture.nativeElement.querySelector('circle');
        expect(circle?.getAttribute('fill')).toBe('#a855f7');
    });
});
