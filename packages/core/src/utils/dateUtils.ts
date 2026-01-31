/**
 * Formats an ISO date string (YYYY-MM-DD) into a locale-aware long format.
 * Example: '2026-04-10' -> 'April 10, 2026' (for en-US)
 */
export function formatLocaleDate(isoDate: string, locale: string = 'en-US'): string {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate + 'T00:00:00Z');
        return new Intl.DateTimeFormat(locale, {
            dateStyle: 'long',
            timeZone: 'UTC',
        }).format(date);
    } catch {
        return isoDate;
    }
}
