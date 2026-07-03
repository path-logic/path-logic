import { Injectable, NgZone, inject, signal } from '@angular/core';
import type { IPayee, IReconciliationMatch, ISODateString, ITransaction } from '@core';
import { KnownCategory, TransactionStatus } from '@core';
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
    readonly unknownCategories = signal<Array<string>>([]);

    // ── Private ──────────────────────────────────────────────────────────────

    private worker: Worker | null = null;
    private currentAccountId: string = '';
    private pendingMatches: Array<IReconciliationMatch> | null = null;
    private pendingTier: ImportTier | null = null;
    private pendingStats: IImportStats | null = null;

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
        this.unknownCategories.set([]);
        this.currentAccountId = '';
        this.pendingMatches = null;
        this.pendingTier = null;
        this.pendingStats = null;
    }

    // ── Category Mapping ─────────────────────────────────────────────────────

    private getCategorySearchPaths(qifCategory: string): Array<string> {
        const isTransfer = qifCategory.startsWith('[') && qifCategory.endsWith(']');
        if (isTransfer) {
            return ['[TRANSFER]'];
        }

        const cleanName = qifCategory.replace(/[[\]]/g, '').trim();
        const paths = [cleanName];

        if (cleanName.includes(':')) {
            const parts = cleanName.split(':');
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
                paths.push(lastPart.trim());
            }
        }

        return paths;
    }

    /**
     * Resolves pending unknown categories, saves them to aliases,
     * applies them to the pending matches, and completes the import.
     */
    async resolveUnknownCategories(mappings: Record<string, string>): Promise<void> {
        if (!this.pendingMatches) return;

        // Save aliases to DB
        for (const [alias, categoryId] of Object.entries(mappings)) {
            if (categoryId) {
                await this.ledgerStore.upsertCategoryAlias(alias, categoryId);
            }
        }

        // Apply mappings to pending matches
        const mappedMatches = this.pendingMatches.map(match => {
            const applyCat = (catStr: string | null): string | null => {
                if (!catStr) return null;
                const paths = this.getCategorySearchPaths(catStr);

                for (const path of paths) {
                    if (path === '[TRANSFER]') return KnownCategory.InternalTransfer;

                    // Exact match
                    const exact = this.ledgerStore
                        .categories()
                        .find(c => c.name.toLowerCase() === path.toLowerCase());
                    if (exact) return exact.id;

                    // Alias match (including the ones we just saved)
                    const mappedId = mappings[path] || this.ledgerStore.getCategoryAlias(path);
                    if (mappedId) return mappedId;
                }

                return null;
            };

            return {
                ...match,
                parsedTx: {
                    ...match.parsedTx,
                    category: applyCat(match.parsedTx.category),
                    splits: (match.parsedTx.splits || []).map(s => ({
                        ...s,
                        category: applyCat(s.category)
                    }))
                }
            };
        });

        const tier = this.pendingTier || 'small';
        const stats = this.pendingStats || {
            newCount: mappedMatches.filter(m => m.type === 'none').length,
            fuzzyCount: mappedMatches.filter(m => m.type === 'fuzzy').length,
            exactCount: mappedMatches.filter(m => m.type === 'exact').length,
            totalCount: mappedMatches.length
        };

        this.applyMappingsAndComplete(mappedMatches, tier, stats);
        this.unknownCategories.set([]);
        this.pendingMatches = null;
        this.pendingStats = null;
        this.pendingTier = null;
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
                    // Yield the main thread to allow the UI to paint the new "Finalizing" state
                    // This creates a deliberate, premium loading state instead of freezing the UI
                    setTimeout(() => {
                        this.finalize(msg.matches, tier, msg.stats);
                        this.worker?.terminate();
                        this.worker = null;
                    }, 400);
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

        // Pre-cache exact matches and SQLite aliases to prevent O(N^2) synchronous freezes
        const categories = this.ledgerStore.categories();
        const categoryMap = new Map<string, string>();
        for (const c of categories) {
            categoryMap.set(c.name.toLowerCase(), c.id);
        }

        const aliasCache = new Map<string, string | null>();

        const resolveCategoryPath = (path: string): string | null => {
            if (path === '[TRANSFER]') return 'INTERNAL_TRANSFER_VIRTUAL_ID'; // Will map to KnownCategory.InternalTransfer

            const lowerPath = path.toLowerCase();
            const catId = categoryMap.get(lowerPath);
            if (catId) return catId;

            const cachedAlias = aliasCache.get(path);
            if (cachedAlias !== undefined) return cachedAlias;

            const aliasMatch = this.ledgerStore.getCategoryAlias(path);
            aliasCache.set(path, aliasMatch);
            return aliasMatch;
        };

        // Scan for unknown categories
        const unknowns = new Set<string>();

        for (const match of matches) {
            const scanCategory = (cat: string | null): void => {
                if (!cat) return;
                const paths = this.getCategorySearchPaths(cat);

                for (const path of paths) {
                    const mappedId = resolveCategoryPath(path);
                    if (mappedId) return; // Found a match!
                }

                // Unknown! Use the fully qualified path
                const firstPath = paths[0];
                if (firstPath) {
                    unknowns.add(firstPath);
                }
            };

            scanCategory(match.parsedTx.category);
            for (const split of match.parsedTx.splits || []) {
                scanCategory(split.category);
            }
        }

        if (unknowns.size > 0) {
            this.unknownCategories.set(Array.from(unknowns));
            this.pendingMatches = matches;
            this.pendingStats = stats;
            this.pendingTier = tier;
            this.progress.set({
                stage: 'mapping_categories',
                pct: 80,
                processed: stats.totalCount,
                total: stats.totalCount,
                tier
            });
            return;
        }

        // Apply any pre-existing mappings right away if there are no unknowns
        const mappedMatches = matches.map(match => {
            const applyCat = (catStr: string | null): string | null => {
                if (!catStr) return null;
                const paths = this.getCategorySearchPaths(catStr);

                for (const path of paths) {
                    const mappedId = resolveCategoryPath(path);
                    if (mappedId === 'INTERNAL_TRANSFER_VIRTUAL_ID') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return (window as any).KnownCategory?.InternalTransfer || '[TRANSFER]';
                    }
                    if (mappedId) return mappedId;
                }

                return null;
            };

            return {
                ...match,
                parsedTx: {
                    ...match.parsedTx,
                    category: applyCat(match.parsedTx.category),
                    splits: (match.parsedTx.splits || []).map(s => ({
                        ...s,
                        category: applyCat(s.category)
                    }))
                }
            };
        });

        this.applyMappingsAndComplete(mappedMatches, tier, stats);
    }

    /**
     * Commits all matched/parsed transactions directly.
     * Used primarily by onboarding wizards (new accounts) where no reconciliation is needed.
     */
    async commitImport(accountId: string): Promise<void> {
        const matches = this.matches();
        if (matches.length === 0) return;

        const now = new Date().toISOString() as ISODateString;
        const txsToImport: Array<ITransaction> = [];
        const newPayees = new Map<string, IPayee>();
        const currentPayees = new Map(this.ledgerStore.payees().map(p => [p.name, p]));

        const categories = this.ledgerStore.categories();
        const mapCategory = (cat: string | null | undefined): string => {
            if (!cat) return KnownCategory.Uncategorized;

            // If already a valid category ID in our store, return it
            if (categories.some(c => c.id === cat)) {
                return cat;
            }

            // Clean: remove brackets and take the last part after ':'
            const cleanNameRaw = cat.replace(/[[\]]/g, '').trim();
            let cleanName = cleanNameRaw;
            if (cleanNameRaw.includes(':')) {
                const parts = cleanNameRaw.split(':');
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                    cleanName = lastPart.trim();
                }
            }

            const match = categories.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
            return match ? match.id : KnownCategory.Uncategorized;
        };

        matches.forEach((match, idx) => {
            const parsed = match.parsedTx;
            let payee = currentPayees.get(parsed.payee) || newPayees.get(parsed.payee);
            if (!payee) {
                payee = {
                    id: `payee-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    name: parsed.payee,
                    address: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    website: null,
                    phone: null,
                    notes: null,
                    defaultCategoryId: null,
                    createdAt: now,
                    updatedAt: now
                };
                newPayees.set(parsed.payee, payee);
            }

            txsToImport.push({
                id: `tx-import-${Date.now()}-${idx}`,
                accountId,
                payeeId: payee.id,
                date: parsed.date,
                payee: parsed.payee,
                memo: parsed.memo,
                totalAmount: parsed.amount,
                status: TransactionStatus.Cleared,
                checkNumber: parsed.checkNumber,
                importHash: parsed.importHash,
                splits:
                    parsed.splits && parsed.splits.length > 0
                        ? parsed.splits.map((s, sIdx) => ({
                              id: `split-import-${Date.now()}-${idx}-${sIdx}`,
                              amount: s.amount,
                              memo: s.memo || '',
                              categoryId: mapCategory(s.category)
                          }))
                        : [
                              {
                                  id: `split-import-${Date.now()}-${idx}`,
                                  amount: parsed.amount,
                                  memo: parsed.memo,
                                  categoryId: mapCategory(parsed.category)
                              }
                          ],
                createdAt: now,
                updatedAt: now
            });
        });

        if (newPayees.size > 0 || txsToImport.length > 0) {
            await this.ledgerStore.applyReconciliationBatch(
                Array.from(newPayees.values()),
                txsToImport,
                []
            );
        }
    }

    private applyMappingsAndComplete(
        matches: Array<IReconciliationMatch>,
        tier: ImportTier,
        stats: IImportStats
    ): void {
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
