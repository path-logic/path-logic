import type { ITransaction } from '@path-logic/core';

/**
 * Format bytes as hex string for display
 */
export function formatBytes(bytes: Uint8Array, maxLength: number = 100): string {
    const slice: Uint8Array = bytes.slice(0, maxLength);
    const hex: string = Array.from(slice)
        .map((b: number): string => b.toString(16).padStart(2, '0'))
        .join(' ');

    const suffix: string = bytes.length > maxLength ? '...' : '';
    return `${hex}${suffix}`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes: Array<string> = ['Bytes', 'KB', 'MB', 'GB'];
    const i: number = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format timestamp as human-readable string
 */
export function formatTimestamp(ms: number): string {
    if (ms === 0) return 'Never';

    const date: Date = new Date(ms);
    return date.toLocaleString();
}

/**
 * Deep comparison of transaction arrays
 */
export function compareTransactions(
    a: Array<ITransaction>,
    b: Array<ITransaction>
): { match: boolean; differences: Array<string> } {
    const differences: Array<string> = [];

    if (a.length !== b.length) {
        differences.push(`Length mismatch: ${a.length} vs ${b.length}`);
        return { match: false, differences };
    }

    for (let i = 0; i < a.length; i++) {
        const txA = a[i];
        const txB = b[i];

        if (!txA || !txB) continue;

        if (txA.id !== txB.id) {
            differences.push(`Transaction ${i}: ID mismatch`);
        }
        if (txA.totalAmount !== txB.totalAmount) {
            differences.push(`Transaction ${i}: Amount mismatch`);
        }
        if (txA.splits.length !== txB.splits.length) {
            differences.push(`Transaction ${i}: Split count mismatch`);
        }
    }

    return {
        match: differences.length === 0,
        differences,
    };
}
