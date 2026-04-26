/**
 * RecurringDetector — Ledger analysis engine for auto-detecting recurring payments.
 *
 * Algorithm:
 * 1. Group transactions by normalized payee name.
 * 2. For groups with ≥ 3 occurrences, measure intervals between consecutive dates.
 * 3. Classify interval median into a Frequency bucket.
 * 4. Score confidence: interval consistency + amount stability.
 * 5. Return sorted proposals (highest confidence first), deduplicating by payee.
 *
 * Splits are preserved from the most recent matching transaction so the user
 * can edit them in the RecurringPaymentForm.
 */

import type { ITransaction } from '../domain/types';
import { Frequency } from '../domain/types';
import type { ISplit } from '../domain/types';

export interface IDetectedPattern {
    /** Normalized payee name used as the key. */
    payee: string;
    /** Account where the transactions were found. */
    accountId: string;
    /** Suggested repeating frequency. */
    suggestedFrequency: Frequency;
    /** Median amount (in cents) across matched occurrences. */
    suggestedAmount: number;
    /**
     * 0–1 confidence score.
     * 0.7+ = high confidence (safe to pre-select).
     * 0.4–0.69 = medium (show to user with caveat).
     * <0.4 = low (suppress unless user opts into low-confidence).
     */
    confidence: number;
    /** The most recent occurrence (used to populate the recurring form). */
    mostRecentTransaction: ITransaction;
    /** Splits from the most recent occurrence (preserves split structure). */
    mostRecentSplits: Array<ISplit>;
    /** Sample of dates from matched transactions. */
    sampleDates: Array<string>;
}

// ── Frequency thresholds (median days between occurrences) ──────────────────
interface IFrequencyBucket {
    frequency: Frequency;
    /** Expected interval in days (center). */
    center: number;
    /** Acceptable deviation ±days from center. */
    tolerance: number;
}

const FREQUENCY_BUCKETS: Array<IFrequencyBucket> = [
    { frequency: Frequency.Weekly,        center: 7,   tolerance: 2  },
    { frequency: Frequency.Biweekly,      center: 14,  tolerance: 3  },
    { frequency: Frequency.Monthly,       center: 30,  tolerance: 5  },
    { frequency: Frequency.Quarterly,     center: 91,  tolerance: 12 },
    { frequency: Frequency.Yearly,        center: 365, tolerance: 20 }
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizePayee(payee: string): string {
    return payee.toLowerCase().trim().replace(/\s+/g, ' ');
}

function median(values: Array<number>): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? (sorted[mid] ?? 0)
        : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function stddev(values: Array<number>, mean: number): number {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

function daysBetween(dateA: string, dateB: string): number {
    return Math.round(
        Math.abs(new Date(dateB).getTime() - new Date(dateA).getTime()) / (1000 * 60 * 60 * 24)
    );
}

function classifyFrequency(medianDays: number): Frequency | null {
    for (const bucket of FREQUENCY_BUCKETS) {
        if (Math.abs(medianDays - bucket.center) <= bucket.tolerance) {
            return bucket.frequency;
        }
    }
    return null;
}

/**
 * Compute a confidence score [0, 1] based on:
 * - Interval consistency: low stddev relative to center = higher confidence
 * - Amount consistency: low coefficient of variation = higher confidence
 * - Occurrence count: more occurrences = higher confidence
 */
function computeConfidence(
    intervals: Array<number>,
    amounts: Array<number>,
    occurrences: number
): number {
    const medianInterval = median(intervals);
    if (medianInterval === 0) return 0;

    const intervalSd = stddev(intervals, medianInterval);
    const intervalCv = intervalSd / medianInterval; // coefficient of variation

    const medianAmount = median(amounts);
    const amountSd = stddev(amounts, medianAmount);
    const amountCv = medianAmount !== 0 ? amountSd / Math.abs(medianAmount) : 1;

    // More occurrences → higher floor
    const countScore = Math.min(1, (occurrences - 2) / 6); // 0 at 2 tx, 1 at 8+

    // Interval consistency (low CV = consistent = good)
    const intervalScore = Math.max(0, 1 - intervalCv * 2);

    // Amount consistency (CV < 0.1 = fixed rate, CV > 0.5 = highly variable)
    const amountScore = Math.max(0, 1 - amountCv * 2);

    return Math.min(1, countScore * 0.25 + intervalScore * 0.45 + amountScore * 0.30);
}

// ── Public API ───────────────────────────────────────────────────────────────

const MIN_OCCURRENCES = 3;
const MIN_CONFIDENCE = 0.35;

/**
 * Analyze a flat list of transactions and return detected recurring patterns.
 * Results are sorted by confidence descending.
 *
 * @param transactions - All transactions from a ledger (or filtered by account).
 * @param minConfidence - Minimum confidence threshold (default 0.35).
 */
export function detectRecurringPatterns(
    transactions: Array<ITransaction>,
    minConfidence = MIN_CONFIDENCE
): Array<IDetectedPattern> {
    // Group by normalized payee + accountId
    const groups = new Map<string, Array<ITransaction>>();

    for (const tx of transactions) {
        if (!tx.payee) continue;
        const key = `${tx.accountId}::${normalizePayee(tx.payee)}`;
        const group = groups.get(key) ?? [];
        group.push(tx);
        groups.set(key, group);
    }

    const results: Array<IDetectedPattern> = [];

    for (const [, group] of groups) {
        if (group.length < MIN_OCCURRENCES) continue;

        // Sort by date ascending
        const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));

        // Compute intervals
        const intervals: Array<number> = [];
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            if (prev && curr) {
                intervals.push(daysBetween(prev.date, curr.date));
            }
        }

        if (intervals.length === 0) continue;

        const medianInterval = median(intervals);
        const frequency = classifyFrequency(medianInterval);
        if (!frequency) continue; // No recognizable pattern

        const amounts = sorted.map(t => t.totalAmount);
        const confidence = computeConfidence(intervals, amounts, sorted.length);

        if (confidence < minConfidence) continue;

        const mostRecent = sorted[sorted.length - 1]!;

        results.push({
            payee: mostRecent.payee,
            accountId: mostRecent.accountId,
            suggestedFrequency: frequency,
            suggestedAmount: median(amounts),
            confidence,
            mostRecentTransaction: mostRecent,
            mostRecentSplits: mostRecent.splits ?? [],
            sampleDates: sorted.slice(-5).map(t => t.date)
        });
    }

    // Sort by confidence descending
    return results.sort((a, b) => b.confidence - a.confidence);
}
