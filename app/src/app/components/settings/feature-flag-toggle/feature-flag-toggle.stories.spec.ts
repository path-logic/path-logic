import type { Signal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { FeatureFlagService } from '../../../services/feature-flag/feature-flag.service';
import { UserSettingsStore } from '../../../services/user-settings-store/user-settings.store';
import { FeatureFlagToggleComponent } from './feature-flag-toggle.component';
import { InteractiveToggle } from './feature-flag-toggle.component.stories';

class MockFeatureFlagService {
    private flags = signal<Record<string, boolean>>({
        enable_multi_user: false
    });

    isEnabled(flag: string): Signal<boolean> {
        return computed(() => !!this.flags()[flag]);
    }

    toggle(flag: string, enabled: boolean): void {
        this.flags.update(prev => ({ ...prev, [flag]: enabled }));
    }
}

const mockSettingsStore = {
    updateSetting: async (_key: string, _value: string) => {}
};

describe('FeatureFlagToggleComponent (Storybook Interaction Spec Wrapper)', () => {
    it('executes InteractiveToggle story interaction test', async () => {
        await TestBed.configureTestingModule({
            imports: [FeatureFlagToggleComponent],
            providers: [
                provideRouter([]),
                { provide: FeatureFlagService, useClass: MockFeatureFlagService },
                { provide: UserSettingsStore, useValue: mockSettingsStore }
            ]
        }).compileComponents();

        const fixture: ComponentFixture<FeatureFlagToggleComponent> = TestBed.createComponent(
            FeatureFlagToggleComponent
        );
        fixture.componentRef.setInput('flag', InteractiveToggle.args?.flag);
        fixture.componentRef.setInput('label', InteractiveToggle.args?.label);
        fixture.componentRef.setInput('description', InteractiveToggle.args?.description);
        fixture.detectChanges();

        await InteractiveToggle.play?.({ canvasElement: fixture.nativeElement } as any);
        expect(fixture.nativeElement.textContent).toContain('Interactive Flag');
    });
});
