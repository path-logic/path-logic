import type { Cents, ISODateString } from '../domain/types';

/**
 * A fast, non-cryptographic, deterministic 64-bit hash function.
 * Used for deterministic deduplication hashes in a browser-safe way.
 * Returns a 16-character hex string.
 */
function cyrb64(str: string, seed: number = 0): string {
    let h1: number = 0xdeadbeef ^ seed;
    let h2: number = 0x41c6ce57 ^ seed;
    for (let i = 0, ch: number; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generates a deterministic hash for a transaction based on key fields.
 * Used for deduplication during QIF/CSV imports.
 */
export function generateImportHash(date: ISODateString, amount: Cents, payee: string): string {
    const normalized: string = `${date}|${amount}|${payee.toLowerCase().trim()}`;
    return cyrb64(normalized).slice(0, 16);
}
