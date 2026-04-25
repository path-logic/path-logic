/**
 * @file qif-import.worker.ts
 * Web Worker for off-thread QIF parsing and reconciliation.
 *
 * Isolation note: Workers are bundled as a separate chunk by esbuild.
 * We use the relative path to the core modules to ensure they resolve
 * correctly in both the main bundle and this worker bundle.
 */

import { ReconciliationEngine } from '../core/engine/ReconciliationEngine';
import { QIFParser } from '../core/parsers/QIFParser';
import type {
    IImportStats,
    IWorkerDoneMessage,
    IWorkerErrorMessage,
    IWorkerProgressMessage,
    WorkerInboundMessage
} from '../services/import/import.types';

let cancelled = false;

/**
 * Post a typed message to the main thread.
 */
function post(msg: IWorkerProgressMessage | IWorkerDoneMessage | IWorkerErrorMessage): void {
    self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>): void => {
    const msg = event.data;

    if (msg.type === 'cancel') {
        cancelled = true;
        return;
    }

    if (msg.type !== 'start') return;

    cancelled = false;
    const { qifContent, existingTxs } = msg;

    try {
        // ── Stage 1: PARSING ─────────────────────────────────────────────────
        post({ type: 'progress', stage: 'parsing', pct: 5, processed: 0, total: 0 });

        const parser = new QIFParser();
        const parseResult = parser.parse(qifContent);
        const parsed = parseResult.transactions;

        if (cancelled) return;

        post({
            type: 'progress',
            stage: 'parsing',
            pct: 40,
            processed: parsed.length,
            total: parsed.length
        });

        // ── Stage 2: RECONCILIATION (chunked for large datasets) ──────────────
        post({
            type: 'progress',
            stage: 'reconciling',
            pct: 45,
            processed: 0,
            total: parsed.length
        });

        const CHUNK_SIZE = 250;
        const matches = [];
        let processed = 0;

        for (let i = 0; i < parsed.length; i += CHUNK_SIZE) {
            if (cancelled) return;

            const chunk = parsed.slice(i, i + CHUNK_SIZE);
            const chunkMatches = ReconciliationEngine.reconcile(chunk, existingTxs);
            matches.push(...chunkMatches);

            processed += chunk.length;
            const pct = 45 + Math.round((processed / parsed.length) * 50);

            post({
                type: 'progress',
                stage: 'reconciling',
                pct,
                processed,
                total: parsed.length
            });
        }

        if (cancelled) return;

        // ── Stage 3: STATS ────────────────────────────────────────────────────
        const stats: IImportStats = {
            newCount: matches.filter(m => m.type === 'none').length,
            fuzzyCount: matches.filter(m => m.type === 'fuzzy').length,
            exactCount: matches.filter(m => m.type === 'exact').length,
            totalCount: parsed.length
        };

        post({
            type: 'progress',
            stage: 'done',
            pct: 100,
            processed: parsed.length,
            total: parsed.length
        });

        post({ type: 'done', matches, stats });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error in import worker';
        post({ type: 'error', message });
    }
};
