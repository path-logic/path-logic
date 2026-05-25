/**
 * @file import.types.ts
 * Shared types for the QIF Import Orchestration pipeline.
 */

import type { IReconciliationMatch } from '@core';

// ─────────────────────────────────────────────
// Size-based import strategy tiers
// ─────────────────────────────────────────────

export type ImportTier = 'small' | 'medium' | 'large';

/** Byte thresholds for tier classification */
export const IMPORT_TIER_THRESHOLDS = {
    /** Files < 50 KB are processed inline on the main thread */
    SMALL_MAX: 50 * 1024,
    /** Files 50 KB – 250 KB use a worker with progress reporting */
    MEDIUM_MAX: 250 * 1024
    /** Files > 250 KB use a worker + the Smart Review dialog */
} as const;

/** Minimum match count to trigger Smart Review (large-dataset) dialog mode */
export const LARGE_DATASET_THRESHOLD = 20;

// ─────────────────────────────────────────────
// Import progress
// ─────────────────────────────────────────────

export type ImportStage =
    | 'idle'
    | 'reading'
    | 'parsing'
    | 'reconciling'
    | 'mapping_categories'
    | 'done'
    | 'error'
    | 'cancelled';

export interface IImportProgress {
    stage: ImportStage;
    /** Overall 0–100 percentage. */
    pct: number;
    /** Number of items processed so far (for counter display). */
    processed: number;
    /** Total items to process (0 if unknown). */
    total: number;
    /** File size tier — drives UX decisions in templates. */
    tier: ImportTier;
}

// ─────────────────────────────────────────────
// Import stats (populated when done)
// ─────────────────────────────────────────────

export interface IImportStats {
    /** Transactions with no match in the local ledger. */
    newCount: number;
    /** Transactions that fuzzy-matched (need user review). */
    fuzzyCount: number;
    /** Transactions that exactly matched (safe to auto-skip). */
    exactCount: number;
    /** Total parsed from the file. */
    totalCount: number;
}

// ─────────────────────────────────────────────
// Messages: Main thread → Worker
// ─────────────────────────────────────────────

export interface IWorkerStartMessage {
    type: 'start';
    qifContent: string;
    /** Lightweight snapshot of existing transactions for reconciliation. */
    existingTxs: Array<{
        id: string;
        date: string;
        totalAmount: number;
        importHash: string;
    }>;
}

export interface IWorkerCancelMessage {
    type: 'cancel';
}

export type WorkerInboundMessage = IWorkerStartMessage | IWorkerCancelMessage;

// ─────────────────────────────────────────────
// Messages: Worker → Main thread
// ─────────────────────────────────────────────

export interface IWorkerProgressMessage {
    type: 'progress';
    stage: ImportStage;
    pct: number;
    processed: number;
    total: number;
}

export interface IWorkerDoneMessage {
    type: 'done';
    matches: Array<IReconciliationMatch>;
    stats: IImportStats;
}

export interface IWorkerErrorMessage {
    type: 'error';
    message: string;
}

export type WorkerOutboundMessage =
    | IWorkerProgressMessage
    | IWorkerDoneMessage
    | IWorkerErrorMessage;

// ─────────────────────────────────────────────
// Bulk decision helper
// ─────────────────────────────────────────────

export type ReconciliationDecision = 'import' | 'match' | 'ignore';
