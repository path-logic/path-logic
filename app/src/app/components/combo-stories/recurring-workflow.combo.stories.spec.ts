import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideStoryFixtures } from '../../testing/story-fixtures';
import {
    ComboRecurringWorkflowComponent,
    DefaultScheduleView,
    InteractiveCreateRecurringSchedule,
    InteractivePostOccurrenceFlow,
    sharedMockLedgerStore
} from './recurring-workflow.combo.stories';

describe('ComboRecurringWorkflowComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboRecurringWorkflowComponent>;
    let detectChangesInterval: ReturnType<typeof setInterval>;

    beforeEach(async () => {
        sharedMockLedgerStore.reset();

        await TestBed.configureTestingModule({
            imports: [ComboRecurringWorkflowComponent],
            providers: provideStoryFixtures({ customLedger: sharedMockLedgerStore })
        }).compileComponents();

        fixture = TestBed.createComponent(ComboRecurringWorkflowComponent);
        fixture.detectChanges();

        detectChangesInterval = setInterval((): void => {
            try {
                fixture.detectChanges();
            } catch {
                // Ignore if fixture is destroyed
            }
        }, 50);
    });

    afterEach((): void => {
        clearInterval(detectChangesInterval);
    });

    it('executes DefaultScheduleView story interaction test', async () => {
        await DefaultScheduleView.play?.({ canvasElement: fixture.nativeElement } as any);

        const text = fixture.nativeElement.textContent || '';
        expect(text).toContain('Recurring Workflow Simulator');
        expect(text).toContain('Highland Properties');
        expect(text).toContain('Metro Electric');
    });

    it('executes InteractiveCreateRecurringSchedule story interaction test', async () => {
        await InteractiveCreateRecurringSchedule.play?.({
            canvasElement: fixture.nativeElement
        } as any);

        const text = document.body.textContent || '';
        expect(text).toContain('Netflix Subscription');
    });

    it('executes InteractivePostOccurrenceFlow story interaction test', async () => {
        await InteractivePostOccurrenceFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);

        const text = fixture.nativeElement.textContent || '';
        expect(text).toContain('2026-11-15');
    });
});
