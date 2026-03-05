/**
 * Event name for Google Drive authentication failures.
 */
export const GDRIVE_AUTH_ERROR_EVENT = 'path-logic:gdrive-auth-error';

/**
 * Custom error class for Google Drive authentication or permission failures.
 * Used to trigger automatic re-authentication flows.
 */
export class GDriveAuthError extends Error {
    public status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'GDriveAuthError';
        this.status = status;

        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, GDriveAuthError.prototype);
    }
}

/**
 * Dispatches a global event indicating a Google Drive authentication failure.
 */
export function notifyAuthFailure(status: number): void {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent(GDRIVE_AUTH_ERROR_EVENT, { detail: { status } });
        window.dispatchEvent(event);
    }
}
