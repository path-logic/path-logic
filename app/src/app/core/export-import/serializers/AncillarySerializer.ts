import type { IAncillaryPayload } from '../types/export-import.types';

/**
 * List of sensitive key substrings that must NEVER be exported
 */
const SENSITIVE_KEY_PATTERNS = [
    'aikey',
    'gemini',
    'api_key',
    'apikey',
    'token',
    'authsecret',
    'secret',
    'password',
    'privatekey'
];

/**
 * AncillarySerializer handles packing and unpacking ancillary application data
 * while enforcing strict security rules (e.g. AI key exclusion).
 */
export const AncillarySerializer = {
    /**
     * Serializes ancillary settings into a sanitized JSON string.
     * Guaranteed to exclude sensitive API keys / credentials.
     */
    serialize: (payload: IAncillaryPayload): string => {
        const sanitizedPayload: IAncillaryPayload = {
            categories: (payload.categories || []).map(c => ({ ...c })),
            payees: (payload.payees || []).map(p => ({ ...p })),
            recurringSchedules: (payload.recurringSchedules || []).map(s => ({ ...s })),
            featureFlags: sanitizeObject(payload.featureFlags || {}) as Record<string, boolean>,
            userSettings: sanitizeObject(payload.userSettings || {})
        };

        return JSON.stringify(sanitizedPayload, null, 2);
    },

    /**
     * Deserializes an ancillary settings JSON string into structured payload.
     */
    deserialize: (jsonContent: string): IAncillaryPayload => {
        if (!jsonContent || jsonContent.trim().length === 0) {
            return {
                categories: [],
                payees: [],
                recurringSchedules: [],
                featureFlags: {},
                userSettings: {}
            };
        }

        const parsed = JSON.parse(jsonContent) as Partial<IAncillaryPayload>;

        return {
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            payees: Array.isArray(parsed.payees) ? parsed.payees : [],
            recurringSchedules: Array.isArray(parsed.recurringSchedules)
                ? parsed.recurringSchedules
                : [],
            featureFlags: sanitizeObject(parsed.featureFlags || {}) as Record<string, boolean>,
            userSettings: sanitizeObject(parsed.userSettings || {})
        };
    }
};

/**
 * Recursively strips keys matching sensitive security patterns without dynamic delete
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEY_PATTERNS.some(pattern => lowerKey.includes(pattern))) {
            continue;
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }

    return result;
}
