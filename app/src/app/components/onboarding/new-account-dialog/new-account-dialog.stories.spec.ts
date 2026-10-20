import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../../services/auth/auth.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { PostHogService } from '../../../services/posthog/posthog.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { NewAccountDialogComponent } from './new-account-dialog.component';
import {
    ImportInProgress,
    ImportReady,
    InteractiveCreateAndImportFlow,
    InteractiveStandardAccountFlow
} from './new-account-dialog.component.stories';
import {
    mockImportService,
    mockPostHogService,
    mockRouter,
    mockSettingsStore,
    storyTracker
} from './new-account-dialog.mock';

describe('NewAccountDialogComponent (Storybook Interaction Spec Wrapper)', () => {
    const mockAuthService = {
        user: signal(null),
        isAuthenticated: signal(false)
    };

    beforeEach(async () => {
        mockImportService.reset();

        await TestBed.configureTestingModule({
            imports: [NewAccountDialogComponent],
            providers: [
                { provide: UserSettingsStore, useValue: mockSettingsStore },
                { provide: AuthService, useValue: mockAuthService },
                { provide: PostHogService, useValue: mockPostHogService },
                { provide: ImportOrchestrationService, useValue: mockImportService },
                { provide: Router, useValue: mockRouter }
            ]
        }).compileComponents();
    });

    it('renders Open story', async () => {
        const fixture: ComponentFixture<NewAccountDialogComponent> =
            TestBed.createComponent(NewAccountDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();

        expect(document.body.textContent).toContain('Add New Account');
    });

    it('executes InteractiveStandardAccountFlow story interaction test', async () => {
        const fixture: ComponentFixture<NewAccountDialogComponent> =
            TestBed.createComponent(NewAccountDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();

        await InteractiveStandardAccountFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        expect(document.body.textContent).toContain('Daily spending & income');
    }, 15000);

    it('executes InteractiveCreateAndImportFlow story interaction test', async () => {
        const fixture: ComponentFixture<NewAccountDialogComponent> =
            TestBed.createComponent(NewAccountDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();

        await InteractiveCreateAndImportFlow.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        expect(document.body.textContent).toContain('Import Ready!');
        expect(storyTracker.lastStartImportOptions?.deferCategoryMapping).toBe(true);
        expect(storyTracker.commitImportCalled).toBe(true);
    }, 15000);

    it('executes ImportInProgress story interaction test', async () => {
        const fixture: ComponentFixture<NewAccountDialogComponent> =
            TestBed.createComponent(NewAccountDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();

        await ImportInProgress.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        expect(document.body.textContent).toContain('Parsing');
        expect(document.body.textContent).toContain('600 / 1,000 transactions');
    }, 15000);

    it('executes ImportReady story interaction test', async () => {
        const fixture: ComponentFixture<NewAccountDialogComponent> =
            TestBed.createComponent(NewAccountDialogComponent);
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();

        await ImportReady.play?.({
            canvasElement: fixture.nativeElement
        } as any);
        expect(document.body.textContent).toContain('Import Ready!');
        expect(document.body.textContent).toContain(
            '7,912 transactions parsed and ready to review.'
        );
    }, 15000);
});
