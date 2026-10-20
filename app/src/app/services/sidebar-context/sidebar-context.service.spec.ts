import type { TemplateRef } from '@angular/core';
import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SidebarContextService } from './sidebar-context.service';

@Component({
    standalone: true,
    template: `<ng-template #testTemplate><div>Dynamic Context Content</div></ng-template>`
})
class TestHostComponent {
    readonly testTemplate = viewChild.required<TemplateRef<unknown>>('testTemplate');
}

describe('SidebarContextService', () => {
    let service: SidebarContextService;

    beforeEach(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.clear();
        }
        TestBed.configureTestingModule({
            providers: [SidebarContextService]
        });
        service = TestBed.inject(SidebarContextService);
    });

    it('should initialize with no custom template and hasContext false', () => {
        expect(service.customTemplate()).toBeNull();
        expect(service.hasContext()).toBe(false);
        expect(service.isNavSectionCollapsed()).toBe(false);
    });

    it('should register a custom template and set hasContext to true', () => {
        const fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
        const template = fixture.componentInstance.testTemplate();

        service.setContext(template);

        expect(service.customTemplate()).toBe(template);
        expect(service.hasContext()).toBe(true);
    });

    it('should clear custom template and set hasContext to false', () => {
        const fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
        const template = fixture.componentInstance.testTemplate();

        service.setContext(template);
        expect(service.hasContext()).toBe(true);

        service.clearContext();
        expect(service.customTemplate()).toBeNull();
        expect(service.hasContext()).toBe(false);
    });

    it('should toggle and set the isNavSectionCollapsed state', () => {
        expect(service.isNavSectionCollapsed()).toBe(false);

        service.toggleNavSection();
        expect(service.isNavSectionCollapsed()).toBe(true);

        service.setNavSectionCollapsed(false);
        expect(service.isNavSectionCollapsed()).toBe(false);

        service.setNavSectionCollapsed(true);
        expect(service.isNavSectionCollapsed()).toBe(true);
    });

    it('should initialize with navPosition top and allow toggling to bottom', () => {
        expect(service.navPosition()).toBe('top');

        service.toggleNavPosition();
        expect(service.navPosition()).toBe('bottom');

        service.setNavPosition('top');
        expect(service.navPosition()).toBe('top');

        service.setNavPosition('bottom');
        expect(service.navPosition()).toBe('bottom');
    });
});
