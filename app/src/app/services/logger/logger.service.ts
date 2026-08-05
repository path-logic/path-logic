import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface IRemoteLogEntry {
    level: 'debug' | 'log' | 'info' | 'warn' | 'error';
    message: string;
    details?: unknown;
    stack?: string;
    timestamp: string;
}

@Injectable({
    providedIn: 'root'
})
export class LoggerService {
    private isInitialized = false;

    constructor() {
        this.init();
    }

    /**
     * Initializes console wrapping ONLY if environment.enableRemoteLogging is strictly true.
     */
    init(): void {
        const win = window as unknown as Record<string, boolean>;
        if (
            this.isInitialized ||
            win['__PATH_LOGIC_LOGGER_INITIALIZED__'] ||
            !environment.enableRemoteLogging
        ) {
            return;
        }

        this.isInitialized = true;
        win['__PATH_LOGIC_LOGGER_INITIALIZED__'] = true;
        const endpoint = environment.remoteLogEndpoint || '/api/log';

        const originalLog = console.log;
        const originalInfo = console.info;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalDebug = console.debug;

        const sendRemoteLog = (
            level: IRemoteLogEntry['level'],
            args: Array<unknown>,
            stack?: string
        ): void => {
            const message = args
                .map(a =>
                    typeof a === 'object' ? (a instanceof Error ? a.message : 'Object') : String(a)
                )
                .join(' ');

            const payload: IRemoteLogEntry = {
                level,
                message,
                timestamp: new Date().toISOString()
            };

            if (args.length > 1) {
                payload.details = args.slice(1);
            }
            if (stack) {
                payload.stack = stack;
            }

            // Fire-and-forget fetch to avoid blocking the main UI thread
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {
                // Silently swallow proxy fetch errors if dev server endpoint is unreachable
            });
        };

        console.log = (...args: Array<unknown>): void => {
            originalLog.apply(console, args);
            sendRemoteLog('log', args);
        };

        console.info = (...args: Array<unknown>): void => {
            originalInfo.apply(console, args);
            sendRemoteLog('info', args);
        };

        console.warn = (...args: Array<unknown>): void => {
            originalWarn.apply(console, args);
            sendRemoteLog('warn', args);
        };

        console.error = (...args: Array<unknown>): void => {
            originalError.apply(console, args);
            sendRemoteLog('error', args);
        };

        console.debug = (...args: Array<unknown>): void => {
            originalDebug.apply(console, args);
            sendRemoteLog('debug', args);
        };
    }

    /**
     * Helper to manually post remote log events.
     */
    logRemote(
        level: IRemoteLogEntry['level'],
        message: string,
        details?: unknown,
        stack?: string
    ): void {
        if (!environment.enableRemoteLogging) return;

        const endpoint = environment.remoteLogEndpoint || '/api/log';
        const payload: IRemoteLogEntry = {
            level,
            message,
            timestamp: new Date().toISOString()
        };

        if (details !== undefined) {
            payload.details = details;
        }
        if (stack) {
            payload.stack = stack;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => void 0);
    }
}
