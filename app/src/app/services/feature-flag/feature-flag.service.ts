import type { Signal, WritableSignal } from '@angular/core';
import { computed, Injectable, signal } from '@angular/core';

/**
 * Cookie prefix for feature flags.
 * Must match the prefix used by the legacy @feature-flags package.
 */
const COOKIE_PREFIX: string = 'ff_';

/**
 * Custom event name for feature flag changes
 * (fallback for browsers without CookieStore API)
 */
const FLAG_CHANGE_EVENT: string = 'featureFlagChange';

/**
 * Event detail interface for flag changes
 */
interface IFlagChangeDetail {
    flag: string;
    enabled: boolean;
}

/**
 * Check if CookieStore API is available
 */
function hasCookieStoreAPI(): boolean {
    return typeof window !== 'undefined' && 'cookieStore' in window;
}

/**
 * Set a cookie with the given name and value
 */
function setCookie(name: string, value: string, days: number = 365): void {
    const expires: Date = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Delete a cookie by setting its expiration to the past
 */
function deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

/**
 * Angular signal-based feature flag service.
 *
 * Replaces the React hooks (`useFeatureFlag`, `useAllFlags`) from
 * `@feature-flags/client` with Angular signals.
 *
 * Cookie persistence uses the same `ff_` prefix for backward compatibility.
 * Listens for cookie changes via CookieStore API (Chrome) or custom events (fallback).
 *
 * @example
 * ```typescript
 * // In a component
 * readonly featureFlags = inject(FeatureFlagService);
 * readonly devEnabled = this.featureFlags.isEnabled('dev');
 *
 * // In template
 * @if (devEnabled()) {
 *   <dev-tools />
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
    /** Internal writable flags map */
    private readonly _flags: WritableSignal<Record<string, boolean>> = signal<
        Record<string, boolean>
    >({});

    /** Read-only flags map (all flags and their current states) */
    readonly flags: Signal<Record<string, boolean>> = this._flags.asReadonly();

    constructor() {
        // Sync from cookies on init
        this.syncFromCookies();

        // Listen for cookie/flag changes
        this.setupChangeListeners();
    }

    /**
     * Get a computed signal for whether a specific flag is enabled.
     * Returns a cached computed signal (same reference on repeated calls).
     */
    isEnabled(flag: string): Signal<boolean> {
        return computed((): boolean => !!this._flags()[flag]);
    }

    /**
     * Toggle a feature flag on or off.
     * Updates both the cookie and the internal signal state.
     */
    toggle(flag: string, enabled: boolean): void {
        const cookieName: string = `${COOKIE_PREFIX}${flag}`;

        if (enabled) {
            setCookie(cookieName, 'true');
        } else {
            deleteCookie(cookieName);
        }

        // Update internal state
        this._flags.update(
            (current: Record<string, boolean>): Record<string, boolean> => ({
                ...current,
                [flag]: enabled
            })
        );

        // Emit custom event for cross-component sync (fallback for non-CookieStore browsers)
        if (!hasCookieStoreAPI()) {
            const event: CustomEvent<IFlagChangeDetail> = new CustomEvent<IFlagChangeDetail>(
                FLAG_CHANGE_EVENT,
                {
                    detail: { flag, enabled }
                }
            );
            window.dispatchEvent(event);
        }
    }

    /**
     * Read all `ff_*` cookies and populate the internal signal state.
     */
    private syncFromCookies(): void {
        if (typeof document === 'undefined') return;

        const allFlags: Record<string, boolean> = {};
        const cookies: Array<string> = document.cookie.split(';');

        for (const cookie of cookies) {
            const trimmedCookie: string = cookie.trim();
            const [name, value]: Array<string> = trimmedCookie.split('=');
            if (name?.startsWith(COOKIE_PREFIX)) {
                const flagName: string = name.substring(COOKIE_PREFIX.length);
                allFlags[flagName] = value === 'true';
            }
        }

        this._flags.set(allFlags);
    }

    /**
     * Set up listeners for cookie changes (CookieStore API or custom events).
     */
    private setupChangeListeners(): void {
        if (typeof window === 'undefined') return;

        if (hasCookieStoreAPI()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).cookieStore.addEventListener('change', (event: any): void => {
                this._flags.update((current: Record<string, boolean>): Record<string, boolean> => {
                    const updated: Record<string, boolean> = { ...current };

                    for (const cookie of event.changed ?? []) {
                        if (cookie.name?.startsWith(COOKIE_PREFIX)) {
                            const flagName: string = cookie.name.substring(COOKIE_PREFIX.length);
                            updated[flagName] = cookie.value === 'true';
                        }
                    }

                    for (const cookie of event.deleted ?? []) {
                        if (cookie.name?.startsWith(COOKIE_PREFIX)) {
                            const flagName: string = cookie.name.substring(COOKIE_PREFIX.length);
                            updated[flagName] = false;
                        }
                    }

                    return updated;
                });
            });
        } else {
            window.addEventListener(FLAG_CHANGE_EVENT, (event: Event): void => {
                const customEvent: CustomEvent<IFlagChangeDetail> =
                    event as CustomEvent<IFlagChangeDetail>;
                this._flags.update(
                    (current: Record<string, boolean>): Record<string, boolean> => ({
                        ...current,
                        [customEvent.detail.flag]: customEvent.detail.enabled
                    })
                );
            });
        }
    }
}
