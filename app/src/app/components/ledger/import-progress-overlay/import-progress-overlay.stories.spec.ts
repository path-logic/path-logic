import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { ImportProgressOverlayComponent } from './import-progress-overlay.component';
import { ReconcilingStage3 } from './import-progress-overlay.component.stories';

describe('ImportProgressOverlayComponent Stories Interaction', () => {
    it('executes ReconcilingStage3 story play function', async () => {
        const mockImportService = {
            progress: signal({
                stage: 'reconciling' as const,
                processed: 42,
                total: 100,
                pct: 42,
                tier: 'medium' as const
            }),
            cancel: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [ImportProgressOverlayComponent],
            providers: [{ provide: ImportOrchestrationService, useValue: mockImportService }]
        }).compileComponents();

        const fixture: ComponentFixture<ImportProgressOverlayComponent> = TestBed.createComponent(
            ImportProgressOverlayComponent
        );
        fixture.detectChanges();

        await ReconcilingStage3.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Checking for Duplicates');
    });
});
