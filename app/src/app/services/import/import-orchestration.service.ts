import { Injectable, NgZone, inject, signal } from '@angular/core';
import type { IReconciliationMatch } from '@core';
import { ReconciliationEngine } from '../../core/engine/ReconciliationEngine';
import { QIFParser } from '../../core/parsers/QIFParser';
import { LedgerStore } from '../ledger-store/ledger.store';
import type {
    IImportProgress,
    IImportStats,
    ImportStage,
    ImportTier,
    ReconciliationDecision,
    WorkerOutboundMessage
} from './import.types';
import { IMPORT_TIER_THRESHOLDS } from './import.types';

export type { IImportProgress, IImportStats, ImportTier, ReconciliationDecision };

/** Lightweight transaction snapshot sent to the worker for reconciliation. */
interface IExistingTxSnapshot {
    id: string;
    date: string;
    totalAmount: number;
    importHash: string;
}

const IDLE_PROGRESS: IImportProgress = {
    stage: 'idle',
    pct: 0,
    processed: 0,
    total: 0,
    tier: 'small'
};

/**
 * ImportOrchestrationService — manages the full QIF import lifecycle.
 *
 * Responsibilities:
 * - Classify file size into a tier (small / medium / large)
 * - Run small imports inline (no worker overhead)
 * - Spawn a Web Worker for medium and large imports
 * - Emit reactive signals for progress and results
 * - Provide a cancel() method that terminates the worker
 */
@Injectable({ providedIn: 'root' })
export class ImportOrchestrationService {
    private readonly ledgerStore = inject(LedgerStore);
    private readonly zone = inject(NgZone);

    // ── Public reactive state ────────────────────────────────────────────────

    readonly progress = signal<IImportProgress>(IDLE_PROGRESS);
    readonly matches = signal<Array<IReconciliationMatch>>([]);
    readonly stats = signal<IImportStats | null>(null);
    readonly error = signal<string | null>(null);

    // ── Private ──────────────────────────────────────────────────────────────

    private worker: Worker | null = null;
    private currentAccountId: string = '';

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Classify a file into an import tier based on its size.
     */
    classifyFile(file: File): ImportTier {
        if (file.size < IMPORT_TIER_THRESHOLDS.SMALL_MAX) return 'small';
        if (file.size < IMPORT_TIER_THRESHOLDS.MEDIUM_MAX) return 'medium';
        return 'large';
    }

    /**
     * Start an import. Automatically selects inline vs. worker strategy.
     */
    startImport(file: File, accountId: string): void {
        this.reset();
        this.currentAccountId = accountId;

        const tier = this.classifyFile(file);
        this.progress.set({ stage: 'reading', pct: 2, processed: 0, total: 0, tier });

        const reader = new FileReader();
        reader.onload = (e): void => {
            const content = e.target?.result as string;
            if (tier === 'small') {
                this.runInline(content, tier);
            } else {
                this.runInWorker(content, tier, accountId);
            }
        };
        reader.onerror = (): void => {
            this.setError('Failed to read file');
        };
        reader.readAsText(file);
    }

    /**
     * Cancel an in-progress worker import.
     */
    cancel(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'cancel' });
            this.worker.terminate();
            this.worker = null;
        }
        this.progress.update(p => ({ ...p, stage: 'cancelled', pct: 0 }));
    }

    /**
     * Reset all state back to idle.
     */
    reset(): void {
        this.cancel();
        this.progress.set(IDLE_PROGRESS);
        this.matches.set([]);
        this.stats.set(null);
        this.error.set(null);
        this.currentAccountId = '';
    }

    // ── Strategy: Inline (small files) ───────────────────────────────────────

    private runInline(content: string, tier: ImportTier): void {
        try {
            this.setStage('parsing', 30, 0, 0, tier);
            const parser = new QIFParser();
            const result = parser.parse(content);

            this.setStage('reconciling', 60, 0, result.transactions.length, tier);
            const existingTxs = this.getExistingTxSnapshots(this.currentAccountId);
            const matches = ReconciliationEngine.reconcile(result.transactions, existingTxs);

            this.finalize(matches, tier);
        } catch (err) {
            this.setError(err instanceof Error ? err.message : 'Parse failed');
        }
    }

    // ── Strategy: Web Worker (medium / large files) ───────────────────────────

    private runInWorker(content: string, tier: ImportTier, accountId: string): void {
        if (typeof Worker === 'undefined') {
            // Fallback: run inline if Workers not supported
            this.runInline(content, tier);
            return;
        }

        const existingTxs = this.getExistingTxSnapshots(accountId);

        try {
            this.worker = new Worker(new URL('../../workers/qif-import.worker', import.meta.url), {
                type: 'module'
            });
        } catch {
            // Worker bundle failed to load, fall back to inline
            this.runInline(content, tier);
            return;
        }

        this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): void => {
            // Re-enter NgZone so Angular's change detection picks up signal updates
            this.zone.run(() => {
                const msg = event.data;
                if (msg.type === 'progress') {
                    this.setStage(msg.stage, msg.pct, msg.processed, msg.total, tier);
                } else if (msg.type === 'done') {
                    this.finalize(msg.matches, tier, msg.stats);
                    this.worker?.terminate();
                    this.worker = null;
                } else if (msg.type === 'error') {
                    this.setError(msg.message);
                    this.worker?.terminate();
                    this.worker = null;
                }
            });
        };

        this.worker.onerror = (err): void => {
            this.zone.run(() => {
                this.setError(err.message ?? 'Worker error');
                this.worker = null;
            });
        };

        this.worker.postMessage({ type: 'start', qifContent: content, existingTxs });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private getExistingTxSnapshots(accountId: string): Array<IExistingTxSnapshot> {
        return this.ledgerStore
            .transactions()
            .filter(tx => tx.accountId === accountId)
            .map(tx => ({
                id: tx.id,
                date: tx.date,
                totalAmount: tx.totalAmount,
                importHash: tx.importHash
            }));
    }

    private setStage(
        stage: ImportStage,
        pct: number,
        processed: number,
        total: number,
        tier: ImportTier
    ): void {
        this.progress.set({ stage, pct, processed, total, tier });
    }

    private finalize(
        matches: Array<IReconciliationMatch>,
        tier: ImportTier,
        incomingStats?: IImportStats
    ): void {
        const stats: IImportStats = incomingStats ?? {
            newCount: matches.filter(m => m.type === 'none').length,
            fuzzyCount: matches.filter(m => m.type === 'fuzzy').length,
            exactCount: matches.filter(m => m.type === 'exact').length,
            totalCount: matches.length
        };

        this.matches.set(matches);
        this.stats.set(stats);
        this.progress.set({
            stage: 'done',
            pct: 100,
            processed: stats.totalCount,
            total: stats.totalCount,
            tier
        });
    }

    private setError(message: string): void {
        this.error.set(message);
        this.progress.update(p => ({ ...p, stage: 'error', pct: 0 }));
    }
}
