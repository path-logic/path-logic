import { ErrorCode } from '../domain/ErrorCode';

/**
 * Standard Result pattern for engine operations.
 */
export type Result<T, E = IEngineError> = { success: true; value: T } | { success: false; error: E };

/**
 * Structured error details for engine failures.
 */
export interface IEngineError {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}
