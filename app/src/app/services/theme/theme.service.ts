import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'pl.theme.preference';

/**
 * ThemeService — manages the three-state theme toggle.
 *
 * ## States
 *   - `system` (default): follows `prefers-color-scheme`. Reacts to OS
 *     theme changes in real time via a `matchMedia` change listener.
 *   - `light`: always light, regardless of OS setting.
 *   - `dark`: always dark, regardless of OS setting.
 *
 * ## Persistence
 *   Uses `localStorage` directly (not IndexedDB / UserSettingsStore) so
 *   the preference is always available synchronously at bootstrap — before
 *   the SQLite database has been initialized. This avoids the
 *   "Database not initialized" error on cold starts.
 *
 * ## Implementation
 *   Sets `data-theme="light" | "dark"` on `<html>`. CSS custom properties
 *   in `styles.css` respond to this attribute. This approach (Option B) is
 *   independent of PrimeNG's own theming system.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);

    /** The user's saved preference: system | light | dark */
    readonly preference = signal<ThemePreference>('system');

    /** The currently applied resolved theme (always light or dark) */
    readonly resolvedTheme = signal<ResolvedTheme>('dark');

    private osMediaQuery: MediaQueryList | null = null;
    private osChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    constructor() {
        this.initialize();

        // Re-apply whenever preference signal changes
        effect(() => {
            this.applyTheme(this.preference());
        });
    }

    /** Sets the user's theme preference and persists it to localStorage. */
    setTheme(preference: ThemePreference): void {
        try {
            localStorage.setItem(STORAGE_KEY, preference);
        } catch {
            // localStorage may be unavailable in some private browsing modes
        }
        this.preference.set(preference);
    }

    private initialize(): void {
        let saved: ThemePreference | null = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
        } catch {
            // Ignore — fall back to system
        }
        // Validate the stored value is still a known preference
        const valid: ThemePreference[] = ['system', 'light', 'dark'];
        this.preference.set(valid.includes(saved as ThemePreference) ? (saved as ThemePreference) : 'system');
    }

    private applyTheme(preference: ThemePreference): void {
        // Clean up any existing OS listener before setting up a new state
        this.teardownOsListener();

        const resolved = this.resolve(preference);
        this.setDataTheme(resolved);

        // When set to 'system', listen for real-time OS changes
        if (preference === 'system') {
            this.setupOsListener();
        }
    }

    private resolve(preference: ThemePreference): ResolvedTheme {
        if (preference === 'system') {
            return this.getOsTheme();
        }
        return preference;
    }

    private getOsTheme(): ResolvedTheme {
        const mq = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');
        return mq?.matches ? 'dark' : 'light';
    }

    private setDataTheme(theme: ResolvedTheme): void {
        this.document.documentElement.setAttribute('data-theme', theme);
        this.resolvedTheme.set(theme);
    }

    private setupOsListener(): void {
        const view = this.document.defaultView;
        if (!view) return;

        this.osMediaQuery = view.matchMedia('(prefers-color-scheme: dark)');
        this.osChangeHandler = (e: MediaQueryListEvent): void => {
            this.setDataTheme(e.matches ? 'dark' : 'light');
        };
        this.osMediaQuery.addEventListener('change', this.osChangeHandler);
    }

    private teardownOsListener(): void {
        if (this.osMediaQuery && this.osChangeHandler) {
            this.osMediaQuery.removeEventListener('change', this.osChangeHandler);
            this.osMediaQuery = null;
            this.osChangeHandler = null;
        }
    }
}
