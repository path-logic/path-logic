import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SkeletonComponent } from './skeleton.component';
import { SkeletonShape } from './skeleton.types';

describe('SkeletonComponent', () => {
    let component: SkeletonComponent;
    let fixture: ComponentFixture<SkeletonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SkeletonComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(SkeletonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the skeleton component', () => {
        expect(component).toBeTruthy();
    });

    it('should default to Rectangle shape and have pulse animation', () => {
        const el = fixture.nativeElement.querySelector('div');
        expect(component.shape()).toBe(SkeletonShape.Rectangle);
        expect(el.className).toContain('animate-pulse');
        expect(el.className).toContain('rounded-lg');
    });

    it('should have role="status" and aria-busy="true" on host element', () => {
        const hostEl = fixture.nativeElement as HTMLElement;
        expect(hostEl.getAttribute('role')).toBe('status');
        expect(hostEl.getAttribute('aria-busy')).toBe('true');
        expect(hostEl.getAttribute('aria-label')).toBe('Loading content...');
    });

    it('should apply Circle shape classes', () => {
        fixture.componentRef.setInput('shape', SkeletonShape.Circle);
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('div');
        expect(el.className).toContain('rounded-full');
        expect(el.className).toContain('aspect-square');
    });

    it('should apply Pill shape classes', () => {
        fixture.componentRef.setInput('shape', SkeletonShape.Pill);
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('div');
        expect(el.className).toContain('rounded-full');
    });

    it('should apply Card shape classes', () => {
        fixture.componentRef.setInput('shape', SkeletonShape.Card);
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('div');
        expect(el.className).toContain('rounded-xl');
        expect(el.className).toContain('border');
    });

    it('should apply Text shape classes', () => {
        fixture.componentRef.setInput('shape', SkeletonShape.Text);
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('div');
        expect(el.className).toContain('rounded');
        expect(el.className).toContain('h-4');
    });

    it('should apply custom width and height styles', () => {
        fixture.componentRef.setInput('width', '120px');
        fixture.componentRef.setInput('height', '32px');
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('div') as HTMLElement;
        expect(el.style.width).toBe('120px');
        expect(el.style.height).toBe('32px');
    });

    it('should apply custom styleClass', () => {
        fixture.componentRef.setInput('styleClass', 'shadow-sm opacity-90');
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('div');
        expect(el.className).toContain('shadow-sm');
        expect(el.className).toContain('opacity-90');
    });
});
