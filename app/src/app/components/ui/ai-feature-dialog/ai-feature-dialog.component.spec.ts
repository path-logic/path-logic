import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiFeatureDialogComponent } from './ai-feature-dialog.component';

describe('AiFeatureDialogComponent', () => {
    let fixture: ComponentFixture<AiFeatureDialogComponent>;
    let component: AiFeatureDialogComponent;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AiFeatureDialogComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);

        fixture = TestBed.createComponent(AiFeatureDialogComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should have default input values', () => {
        expect(component.visible()).toBe(false);
        expect(component.featureName()).toBe('AI Feature');
        expect(component.icon()).toBe('pi pi-sparkles');
        expect(component.canRunOffline()).toBe(false);
    });

    it('should close dialog and navigate to /settings on goToSettings()', () => {
        component.visible.set(true);
        component.goToSettings();

        expect(component.visible()).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/settings']);
    });

    it('should close dialog and emit runOffline on handleRunOffline()', () => {
        component.visible.set(true);
        let offlineEmitted = false;
        component.runOffline.subscribe(() => {
            offlineEmitted = true;
        });

        component.handleRunOffline();

        expect(component.visible()).toBe(false);
        expect(offlineEmitted).toBe(true);
    });
});
