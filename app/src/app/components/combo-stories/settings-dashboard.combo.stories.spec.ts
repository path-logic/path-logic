import { computed } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagService } from '../../services/feature-flag/feature-flag.service';
import { UserSettingsStore } from '../../services/user-settings-store/user-settings.store';
import { ComboSettingsComponent, SettingsWithGuides } from './settings-dashboard.combo.stories';

describe('ComboSettingsComponent (Storybook Interaction Spec Wrapper)', () => {
    let fixture: ComponentFixture<ComboSettingsComponent>;

    const mockFeatureFlagService = {
        isEnabled: vi.fn((flag: string) => computed(() => flag === 'enable_multi_user')),
        toggle: vi.fn()
    };

    const mockUserSettingsStore = {
        getSetting: vi.fn().mockReturnValue('false'),
        updateSetting: vi.fn()
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComboSettingsComponent],
            providers: [
                provideRouter(new Array<any>()),
                { provide: FeatureFlagService, useValue: mockFeatureFlagService },
                { provide: UserSettingsStore, useValue: mockUserSettingsStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ComboSettingsComponent);
        fixture.detectChanges();
    });

    it('executes SettingsWithGuides story interaction test', async () => {
        await SettingsWithGuides.play?.({ canvasElement: fixture.nativeElement } as any);

        const content: string = fixture.nativeElement.textContent;
        expect(content).toContain('Advanced Settings');
        expect(content).toContain('Enable Multi-User Mode');
        expect(content).toContain('Use Demo Data');
        expect(content).toContain('Experimental Features');
        expect(content).toContain(
            'Toggling these flags may cause unexpected behavior. Proceed with caution.'
        );
    });
});
