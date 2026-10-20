import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { WelcomeWizardComponent } from './welcome-wizard.component';
import { InteractiveLoanFlow, InteractiveStandardFlow } from './welcome-wizard.component.stories';

describe('WelcomeWizardComponent (Storybook Interaction Spec Wrapper)', () => {
    let mockSettingsStore: {
        getSetting: (k: string) => string;
        updateSetting: () => void;
    };
    const mockPostHogService = {
        posthog: {
            capture: () => {}
        }
    };
    const mockImportService = {
        progress: signal({
            stage: 'idle',
            pct: 0,
            processed: 0,
            total: 0,
            tier: 'small'
        }),
        stats: signal(null),
        reset: () => {},
        startImport: () => {},
        commitImport: async () => []
    };
    const mockRouter = {
        navigate: async () => true
    };

    beforeEach(async () => {
        mockSettingsStore = {
            getSetting: () => 'false',
            updateSetting: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [WelcomeWizardComponent],
            providers: [
                { provide: UserSettingsStore, useValue: mockSettingsStore },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: Router, useValue: mockRouter }
            ]
        }).compileComponents();
    });

    it('renders StepSelectType story', () => {
        const fixture: ComponentFixture<WelcomeWizardComponent> =
            TestBed.createComponent(WelcomeWizardComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Welcome to Path Logic');
        expect(fixture.nativeElement.textContent).toContain('Checking Account');
        expect(fixture.nativeElement.textContent).toContain('Savings Account');
    });

    it('executes InteractiveStandardFlow story interaction test', async () => {
        const fixture: ComponentFixture<WelcomeWizardComponent> =
            TestBed.createComponent(WelcomeWizardComponent);
        fixture.detectChanges();

        await InteractiveStandardFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);

        expect(fixture.nativeElement.textContent).toContain('Account Name');
    }, 15000);

    it('executes InteractiveLoanFlow story interaction test', async () => {
        const fixture: ComponentFixture<WelcomeWizardComponent> =
            TestBed.createComponent(WelcomeWizardComponent);
        fixture.detectChanges();

        await InteractiveLoanFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);

        expect(fixture.nativeElement.textContent).toContain('Create Mortgage');
    }, 15000);
});
