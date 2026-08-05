import type { ErrorHandler } from '@angular/core';
import { inject, Injectable } from '@angular/core';

import { LoggerService } from '../../services/logger/logger.service';

/**
 * Custom Angular Global Error Handler.
 * Catches uncaught runtime exceptions and posts them to the local dev proxy logger.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private readonly logger = inject(LoggerService);

    handleError(error: unknown): void {
        const errObj = error instanceof Error ? error : new Error(String(error));
        const message = `Uncaught Exception: ${errObj.message}`;
        const stack = errObj.stack;

        // Remote log to dev proxy
        this.logger.logRemote('error', message, error, stack);

        // Re-log to standard console for developer tools
        console.error('Unhandled Error:', error);
    }
}
