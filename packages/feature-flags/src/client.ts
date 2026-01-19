'use client';

import { useEffect, useState } from 'react';

/**
 * Cookie prefix for feature flags
 */
const COOKIE_PREFIX: string = 'ff_';

/**
 * Custom event name for feature flag changes (fallback for browsers without CookieStore API)
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
 * Emit a feature flag change event (fallback for browsers without CookieStore API)
 * Call this after setting a cookie to notify all listeners
 */
export function emitFlagChange(flag: string, enabled: boolean): void {
    // Only emit custom event if CookieStore API is not available
    if (!hasCookieStoreAPI()) {
        const event = new CustomEvent<IFlagChangeDetail>(FLAG_CHANGE_EVENT, {
            detail: { flag, enabled },
        });
        window.dispatchEvent(event);
    }
}

/**
 * Get a cookie value by name (client-side)
 */
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const value: string = `; ${document.cookie}`;
    const parts: Array<string> = value.split(`; ${name}=`);

    if (parts.length === 2) {
        const lastPart: string | undefined = parts.pop();
        return lastPart?.split(';').shift() || null;
    }

    return null;
}

/**
 * React hook to check if a feature flag is enabled (client-side)
 * Uses CookieStore API change events when available, falls back to custom events
 * 
 * @example
 * const devToolsEnabled = useFeatureFlag('dev');
 * if (devToolsEnabled) {
 *   return <DevToolsPanel />;
 * }
 */
export function useFeatureFlag(flag: string): boolean {
    const cookieName: string = `${COOKIE_PREFIX}${flag}`;

    // Initialize to false to match server-side rendering (where getCookie returns null)
    const [enabled, setEnabled] = useState<boolean>(false);

    useEffect((): (() => void) => {
        // Initial sync on mount to catch the real cookie value
        const cookieValue: string | null = getCookie(cookieName);
        setEnabled(cookieValue === 'true');

        // Try to use CookieStore API if available
        if (hasCookieStoreAPI()) {
            const handleCookieChange = (event: ICookieChangeEvent): void => {
                // Check if our flag cookie changed
                for (const cookie of event.changed) {
                    if (cookie.name === cookieName) {
                        setEnabled(cookie.value === 'true');
                    }
                }

                // Handle cookie deletion
                for (const cookie of event.deleted) {
                    if (cookie.name === cookieName) {
                        setEnabled(false);
                    }
                }
            };

            // Subscribe to cookie changes for our specific cookie
            window.cookieStore.addEventListener('change', handleCookieChange);

            return (): void => {
                window.cookieStore.removeEventListener('change', handleCookieChange);
            };
        } else {
            // Fallback to custom event for browsers without CookieStore API
            const handleFlagChange = (event: Event): void => {
                const customEvent: CustomEvent<IFlagChangeDetail> = event as CustomEvent<IFlagChangeDetail>;
                if (customEvent.detail.flag === flag) {
                    setEnabled(customEvent.detail.enabled);
                }
            };

            window.addEventListener(FLAG_CHANGE_EVENT, handleFlagChange);

            return (): void => {
                window.removeEventListener(FLAG_CHANGE_EVENT, handleFlagChange);
            };
        }
    }, [flag, cookieName]);

    return enabled;
}

/**
 * React hook to get all feature flags (client-side)
 * Uses CookieStore API change events when available, falls back to custom events
 * 
 * @example
 * const flags = useAllFlags();
 * console.log(flags); // { dev: true, beta: false }
 */
export function useAllFlags(): Record<string, boolean> {
    // Initialize to empty object to match server-side rendering
    const [flags, setFlags] = useState<Record<string, boolean>>({});

    useEffect((): (() => void) => {
        // Initial sync on mount to catch all real cookie values
        const syncFlags = (): void => {
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
            setFlags(allFlags);
        };

        syncFlags();

        if (hasCookieStoreAPI()) {
            const handleCookieChange = (event: ICookieChangeEvent): void => {
                setFlags((prev: Record<string, boolean>): Record<string, boolean> => {
                    const updated: Record<string, boolean> = { ...prev };

                    // Handle changed cookies
                    for (const cookie of event.changed) {
                        if (cookie.name?.startsWith(COOKIE_PREFIX)) {
                            const flagName: string = cookie.name.substring(COOKIE_PREFIX.length);
                            updated[flagName] = cookie.value === 'true';
                        }
                    }

                    // Handle deleted cookies
                    for (const cookie of event.deleted) {
                        if (cookie.name?.startsWith(COOKIE_PREFIX)) {
                            const flagName: string = cookie.name.substring(COOKIE_PREFIX.length);
                            delete updated[flagName];
                        }
                    }

                    return updated;
                });
            };

            window.cookieStore.addEventListener('change', handleCookieChange);

            return (): void => {
                window.cookieStore.removeEventListener('change', handleCookieChange);
            };
        } else {
            const handleFlagChange = (event: Event): void => {
                const customEvent: CustomEvent<IFlagChangeDetail> = event as CustomEvent<IFlagChangeDetail>;
                setFlags((prev: Record<string, boolean>): Record<string, boolean> => ({
                    ...prev,
                    [customEvent.detail.flag]: customEvent.detail.enabled,
                }));
            };

            window.addEventListener(FLAG_CHANGE_EVENT, handleFlagChange);

            return (): void => {
                window.removeEventListener(FLAG_CHANGE_EVENT, handleFlagChange);
            };
        }
    }, []);

    return flags;
}
