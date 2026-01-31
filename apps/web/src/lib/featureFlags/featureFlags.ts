import { cookies } from 'next/headers';

/**
 * Cookie configuration
 */
const COOKIE_PREFIX: string = 'ff_';
const COOKIE_MAX_AGE: number = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Get the cookie name for a feature flag
 */
function getCookieName(flag: string): string {
    return `${COOKIE_PREFIX}${flag}`;
}

/**
 * Check if a feature flag is enabled (server-side)
 * Use this in Server Components, Route Handlers, and Server Actions
 *
 * @param flag - The feature flag name (e.g., 'dev', 'beta')
 * @returns Promise<boolean> - Whether the flag is enabled
 */
export async function getFlag(flag: string): Promise<boolean> {
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieValue: string | undefined = cookieStore.get(getCookieName(flag))?.value;
    return cookieValue === 'true';
}

/**
 * Set a feature flag (server-side)
 * Use this in Route Handlers and Server Actions
 *
 * @param flag - The feature flag name
 * @param enabled - Whether to enable or disable the flag
 */
export async function setFlag(flag: string, enabled: boolean): Promise<void> {
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    cookieStore.set(getCookieName(flag), enabled ? 'true' : 'false', {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: false, // Allow client-side access for React hooks
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
}

/**
 * Clear a feature flag
 *
 * @param flag - The feature flag name
 */
export async function clearFlag(flag: string): Promise<void> {
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    cookieStore.delete(getCookieName(flag));
}

/**
 * Get all feature flags (server-side)
 * Returns all flags that have been set (have cookies)
 */
export async function getAllFlags(): Promise<Record<string, boolean>> {
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const flags: Record<string, boolean> = {};

    // Get all cookies and filter for feature flags
    const allCookies: ReturnType<typeof cookieStore.getAll> = cookieStore.getAll();
    for (const cookie of allCookies) {
        if (cookie.name.startsWith(COOKIE_PREFIX)) {
            const flagName: string = cookie.name.substring(COOKIE_PREFIX.length);
            flags[flagName] = cookie.value === 'true';
        }
    }

    return flags;
}

/**
 * Create a validator function for allowed flags
 * Use this in your route handler to restrict which flags can be toggled
 *
 * @param allowedFlags - Array of allowed flag names
 * @returns Validator function
 *
 * @example
 * const isValidFlag = createFlagValidator(['dev', 'beta']);
 * if (!isValidFlag('dev')) throw new Error('Invalid flag');
 */
export function createFlagValidator(allowedFlags: Array<string>): (flag: string) => boolean {
    return (flag: string): boolean => allowedFlags.includes(flag);
}
