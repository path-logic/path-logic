import { createHash } from 'crypto';
import { Cents, ISODateString } from '../domain/types';

/**
 * Generates a deterministic hash for a transaction based on key fields.
 * Used for deduplication during QIF/CSV imports.
 */
export function generateImportHash(date: ISODateString, amount: Cents, payee: string): string {
    const normalized = `${date}|${amount}|${payee.toLowerCase().trim()}`;
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
