import { computed, Injectable, signal, type TemplateRef } from '@angular/core';

/**
 * Service to manage dynamic context slots within the global sidebar navigation.
 * Allows routed components (such as AccountLedgerComponent) to project custom
 * toolbars, metrics, and actions below the primary navigation links.
 */
@Injectable({
    providedIn: 'root'
})
export class SidebarContextService {
    /** The active dynamic template to project into the sidebar. */
    readonly customTemplate = signal<TemplateRef<unknown> | null>(null);

    /** Whether the primary navigation links section is collapsed to prioritize page tools. */
    readonly isNavSectionCollapsed = signal<boolean>(false);

    /** Navigation position A/B test variant: 'top' (above dynamic context) or 'bottom' (below dynamic context). */
    readonly navPosition = signal<'top' | 'bottom'>('top');

    /** Computed boolean indicating whether custom contextual content is currently registered. */
    readonly hasContext = computed<boolean>(() => this.customTemplate() !== null);

    constructor() {
        if (typeof window !== 'undefined' && window.localStorage) {
            const savedPosition = localStorage.getItem('path-logic-sidebar-nav-position');
            if (savedPosition === 'top' || savedPosition === 'bottom') {
                this.navPosition.set(savedPosition);
            }
        }
    }

    /**
     * Registers a template to be projected into the sidebar.
     * @param template TemplateRef to render in the sidebar.
     */
    setContext(template: TemplateRef<unknown>): void {
        this.customTemplate.set(template);
    }

    /**
     * Clears the current contextual template from the sidebar.
     */
    clearContext(): void {
        this.customTemplate.set(null);
    }

    /**
     * Toggles the collapsed state of the primary navigation links section.
     */
    toggleNavSection(): void {
        this.isNavSectionCollapsed.update((v: boolean) => !v);
    }

    /**
     * Explicitly sets the collapsed state of the primary navigation links section.
     * @param collapsed Whether the navigation links should be collapsed.
     */
    setNavSectionCollapsed(collapsed: boolean): void {
        this.isNavSectionCollapsed.set(collapsed);
    }

    /**
     * Sets the navigation position variant ('top' or 'bottom') and persists the preference.
     * @param position 'top' or 'bottom'
     */
    setNavPosition(position: 'top' | 'bottom'): void {
        this.navPosition.set(position);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('path-logic-sidebar-nav-position', position);
        }
    }

    /**
     * Toggles between 'top' and 'bottom' navigation position variants.
     */
    toggleNavPosition(): void {
        const next = this.navPosition() === 'top' ? 'bottom' : 'top';
        this.setNavPosition(next);
    }
}
