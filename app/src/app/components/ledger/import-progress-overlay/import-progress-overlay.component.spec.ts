import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import type { IImportProgress } from '../../../services/import/import.types';
import { ImportProgressOverlayComponent } from './import-progress-overlay.component';

describe('ImportProgressOverlayComponent', () => {
    let fixture: ComponentFixture<ImportProgressOverlayComponent>;
    let component: ImportProgressOverlayComponent;
    let progressSignal: ReturnType<typeof signal<IImportProgress>>;

    const createComponent = async (initialProgress: IImportProgress) => {
        progressSignal = signal<IImportProgress>(initialProgress);

        const mockImportService = {
            progress: progressSignal,
            cancel: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [ImportProgressOverlayComponent],
            providers: [{ provide: ImportOrchestrationService, useValue: mockImportService }]
        }).compileComponents();

        fixture = TestBed.createComponent(ImportProgressOverlayComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    };

    it('should create the import progress overlay component', async () => {
        await createComponent({
            stage: 'reconciling',
            processed: 10,
            total: 20,
            pct: 50,
            tier: 'medium'
        });
        expect(component).toBeTruthy();
        expect(component.isVisible()).toBe(true);
    });

    it('should NOT have animate-pulse on stage 3 circle (a11y: no flashing elements)', async () => {
        await createComponent({
            stage: 'reconciling',
            processed: 10,
            total: 20,
            pct: 50,
            tier: 'medium'
        });

        const circles = fixture.nativeElement.querySelectorAll('.rounded-full');
        expect(circles.length).toBeGreaterThan(0);

        // Stage 3 circle corresponds to index 2 (Reconciling)
        const stage3Circle = Array.from(circles).find(
            el => (el as HTMLElement).textContent?.trim() === '3'
        ) as HTMLElement;

        expect(stage3Circle).toBeTruthy();
        // Crucial A11Y invariant: Must not flash or pulse the active step
        expect(stage3Circle.className).not.toContain('animate-pulse');
    });

    it('should display stage labels and counter text', async () => {
        await createComponent({
            stage: 'reconciling',
            processed: 10,
            total: 20,
            pct: 50,
            tier: 'medium'
        });

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Checking for Duplicates');
        expect(text).toContain('10 / 20 transactions');
    });
});
