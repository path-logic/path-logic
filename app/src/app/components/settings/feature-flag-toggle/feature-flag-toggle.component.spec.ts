import type { Signal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlagKey } from '../../../constants/feature-flags';
import { FeatureFlagService } from '../../../services/feature-flag/feature-flag.service';
import { FeatureFlagToggleComponent } from './feature-flag-toggle.component';

class MockFeatureFlagService {
    flags = signal<Record<string, boolean>>({
        [FlagKey.DEV_TOOLS]: false,
        [FlagKey.BETA_FEATURES]: false
    });

    isEnabled(flag: string): Signal<boolean> {
        return computed(() => !!this.flags()[flag]);
    }

    toggle = vi.fn((flag: string, enabled: boolean): void => {
        this.flags.update(prev => ({ ...prev, [flag]: enabled }));
    });
}

describe('FeatureFlagToggleComponent', () => {
    let component: FeatureFlagToggleComponent;
    let fixture: ComponentFixture<FeatureFlagToggleComponent>;
    let mockFeatureFlagService: MockFeatureFlagService;

    beforeEach(async () => {
        mockFeatureFlagService = new MockFeatureFlagService();

        await TestBed.configureTestingModule({
            imports: [FeatureFlagToggleComponent],
            providers: [
                provideRouter([]),
                { provide: FeatureFlagService, useValue: mockFeatureFlagService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FeatureFlagToggleComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('flag', FlagKey.DEV_TOOLS);
        fixture.componentRef.setInput('label', 'Developer Tools');
        fixture.componentRef.setInput(
            'description',
            'Access developer tools and debugging utilities.'
        );
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
        expect(component.flag()).toBe(FlagKey.DEV_TOOLS);
        expect(component.label()).toBe('Developer Tools');
        expect(component.description()).toBe('Access developer tools and debugging utilities.');
    });

    it('should display label and description in template', () => {
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Developer Tools');
        expect(text).toContain('Access developer tools and debugging utilities.');
    });

    it('should not render description paragraph when description input is omitted', () => {
        const fixtureWithoutDesc = TestBed.createComponent(FeatureFlagToggleComponent);
        fixtureWithoutDesc.componentRef.setInput('flag', FlagKey.DEV_TOOLS);
        fixtureWithoutDesc.componentRef.setInput('label', 'Developer Tools');
        fixtureWithoutDesc.detectChanges();

        const descEl = fixtureWithoutDesc.nativeElement.querySelector('p.italic');
        expect(descEl).toBeNull();
    });

    it('should display "Offline" badge when disabled', () => {
        mockFeatureFlagService.flags.set({ [FlagKey.DEV_TOOLS]: false });
        fixture.detectChanges();

        expect(component.enabled()).toBe(false);
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Offline');
        expect(text).not.toContain('Active');
    });

    it('should display "Active" badge when enabled', () => {
        mockFeatureFlagService.flags.set({ [FlagKey.DEV_TOOLS]: true });
        fixture.detectChanges();

        expect(component.enabled()).toBe(true);
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Active');
        expect(text).not.toContain('Offline');
    });

    it('should call featureFlags.toggle with negated state on toggle()', () => {
        mockFeatureFlagService.flags.set({ [FlagKey.DEV_TOOLS]: false });
        fixture.detectChanges();

        component.toggle();
        expect(mockFeatureFlagService.toggle).toHaveBeenCalledWith(FlagKey.DEV_TOOLS, true);

        mockFeatureFlagService.flags.set({ [FlagKey.DEV_TOOLS]: true });
        fixture.detectChanges();

        component.toggle();
        expect(mockFeatureFlagService.toggle).toHaveBeenCalledWith(FlagKey.DEV_TOOLS, false);
    });

    it('should render route jump link when flag is enabled and has an associated route', () => {
        mockFeatureFlagService.flags.set({ [FlagKey.DEV_TOOLS]: true });
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector('a');
        expect(link).toBeTruthy();
        expect(link.textContent).toContain('Jump →');
        expect(link.getAttribute('href')).toBe('/settings/dev');
    });

    it('should not render route jump link when flag is disabled', () => {
        mockFeatureFlagService.flags.set({ [FlagKey.DEV_TOOLS]: false });
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector('a');
        expect(link).toBeNull();
    });

    it('should not render route jump link for flags without a configured route even when enabled', () => {
        fixture.componentRef.setInput('flag', FlagKey.BETA_FEATURES);
        fixture.componentRef.setInput('label', 'Beta Features');
        mockFeatureFlagService.flags.set({ [FlagKey.BETA_FEATURES]: true });
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector('a');
        expect(link).toBeNull();
    });

    it('should have proper aria-label attribute on switch toggle element', () => {
        const switchEl = fixture.nativeElement.querySelector('p-toggleswitch');
        expect(switchEl).toBeTruthy();
        expect(switchEl.getAttribute('aria-label')).toBe('Toggle Developer Tools');
    });
});
