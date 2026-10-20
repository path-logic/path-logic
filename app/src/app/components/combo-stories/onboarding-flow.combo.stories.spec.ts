import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideStoryFixtures, StoryPreset } from '../../testing/story-fixtures';
import { ComboOnboardingComponent, FullWizardWithDialog } from './onboarding-flow.combo.stories';

describe('ComboOnboardingComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboOnboardingComponent>;
    let detectChangesInterval: ReturnType<typeof setInterval>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComboOnboardingComponent],
            providers: provideStoryFixtures({ preset: StoryPreset.Empty })
        }).compileComponents();

        fixture = TestBed.createComponent(ComboOnboardingComponent);
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

    it('executes FullWizardWithDialog story interaction test', async () => {
        await FullWizardWithDialog.play?.({ canvasElement: fixture.nativeElement } as any);

        const bodyText: string = document.body.textContent || '';
        expect(bodyText).toContain('Welcome to Path Logic');
        expect(bodyText).toContain('Add New Account');
        expect(bodyText).toContain('Daily spending & income');
    }, 15000);
});
