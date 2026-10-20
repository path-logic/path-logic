import { DestroyRef, inject, Injectable, NgZone, signal } from '@angular/core';
import type { ICategory, ISODateString, ITransaction } from '@core';
import { matchUnknowns } from '../../core/utils/CategoryHeuristicMatcher';
import { GeminiService } from '../gemini/gemini.service';
import { LedgerStore } from '../ledger-store/ledger.store';
import { SecurityManagerService } from '../security-manager/security-manager.service';
import type {
    AiAutoCategorizeStatus,
    IAiCategorizeError,
    IAiCategorizeProgress,
    IAiCategorySuggestion,
    WorkerOutboundMessage
} from './ai-auto-categorize.types';

@Injectable({ providedIn: 'root' })
export class AiAutoCategorizeService {
    private readonly securityManager = inject(SecurityManagerService);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly geminiService = inject(GeminiService);
    private readonly zone = inject(NgZone);
    private readonly destroyRef = inject(DestroyRef);

    // ── Public Reactive Signals ──────────────────────────────────────────────

    readonly status = signal<AiAutoCategorizeStatus>('idle');
    readonly progress = signal<IAiCategorizeProgress>({
        pct: 0,
        processed: 0,
        total: 0,
        message: ''
    });
    readonly suggestions = signal<Array<IAiCategorySuggestion>>([]);
    readonly error = signal<IAiCategorizeError | null>(null);
    readonly targetTransactions = signal<Array<ITransaction>>([]);

    // ── Private State ────────────────────────────────────────────────────────

    private worker: Worker | null = null;
    private timeoutReleaseFn: (() => void) | null = null;
    private abortController: AbortController | null = null;

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.cleanup();
        });
    }

    /**
     * Starts background auto-categorization for the provided transactions.
     * Extracts unmapped categories/payees and offloads matching to worker/heuristics.
     */
    async startBackgroundCategorization(
        transactions: Array<ITransaction>,
        explicitUnknowns?: Array<string>
    ): Promise<void> {
        this.cleanup();

        if (!transactions || transactions.length === 0) {
            this.status.set('idle');
            return;
        }

        this.targetTransactions.set(transactions);
        this.status.set('running');
        this.error.set(null);

        // 1. Acquire 3x extended session timeout
        this.timeoutReleaseFn = this.securityManager.acquireExtendedTimeout('ai_autocategorize');

        // 2. Identify items needing categorization
        const itemsToMap =
            explicitUnknowns && explicitUnknowns.length > 0
                ? explicitUnknowns
                : this.extractUnknownsFromTransactions(transactions);

        if (itemsToMap.length === 0) {
            this.progress.set({
                pct: 100,
                processed: 0,
                total: 0,
                message: 'All transactions already categorized'
            });
            this.status.set('completed');
            return;
        }

        this.progress.set({
            pct: 5,
            processed: 0,
            total: itemsToMap.length,
            message: 'Starting smart auto-categorization...'
        });

        // 3. Dispatch to Web Worker or inline fallback
        const categories = this.ledgerStore.categories();
        const apiKey = this.geminiService.apiKey();

        if (typeof Worker !== 'undefined') {
            try {
                this.runInWorker(itemsToMap, categories, apiKey);
                return;
            } catch {
                // Fall through to inline if worker creation fails
            }
        }

        await this.runInline(itemsToMap, categories);
    }

    /**
     * Applies all matched and suggested categories to the target transactions.
     * Also bulk upserts default payee categories and aliases in the ledger store.
     * Returns the count of transactions updated.
     */
    async acceptAll(): Promise<number> {
        const suggs = this.suggestions();
        const txs = this.targetTransactions();
        if (suggs.length === 0 || txs.length === 0) {
            this.dismiss();
            return 0;
        }

        const categories = [...this.ledgerStore.categories()];
        const payeeCategoryMappings = new Map<string, string>();
        const aliasMappings = new Map<string, string>();
        const suggestionMap = new Map<string, string>();

        for (const sugg of suggs) {
            let finalCatId = sugg.matchedCategoryId;

            // If a new category was suggested, create it
            if (!finalCatId && sugg.suggestedNewCategory?.name) {
                const newName = sugg.suggestedNewCategory.name;
                const parentName = sugg.suggestedNewCategory.parentName;

                let parentId: string | null = null;
                if (parentName) {
                    const existingParent = categories.find(
                        c => !c.parentId && c.name.toLowerCase() === parentName.toLowerCase()
                    );
                    if (existingParent) {
                        parentId = existingParent.id;
                    } else {
                        const newParent = await this.ledgerStore.createCategory(parentName, null);
                        parentId = newParent.id;
                        categories.push(newParent);
                    }
                }

                const existingChild = categories.find(
                    c => c.parentId === parentId && c.name.toLowerCase() === newName.toLowerCase()
                );
                if (existingChild) {
                    finalCatId = existingChild.id;
                } else {
                    const newChild = await this.ledgerStore.createCategory(newName, parentId);
                    finalCatId = newChild.id;
                    categories.push(newChild);
                }
            }

            if (finalCatId) {
                suggestionMap.set(sugg.unknownCategory.toLowerCase(), finalCatId);

                if (sugg.unknownCategory.startsWith('Payee: ')) {
                    const pName = sugg.unknownCategory.replace(/^Payee:\s*/, '').trim();
                    payeeCategoryMappings.set(pName, finalCatId);
                } else {
                    aliasMappings.set(sugg.unknownCategory, finalCatId);
                }
            }
        }

        // Apply bulk updates to payees and category aliases
        if (payeeCategoryMappings.size > 0 || aliasMappings.size > 0) {
            await this.ledgerStore.bulkUpsertPayeesAndAliases(payeeCategoryMappings, aliasMappings);
        }

        // Update target transactions
        let updatedCount = 0;
        const now: ISODateString = new Date().toISOString() as ISODateString;

        for (const tx of txs) {
            let matchedCatId: string | undefined;

            // Check payee match
            if (tx.payee) {
                matchedCatId =
                    suggestionMap.get(`payee: ${tx.payee.toLowerCase()}`) ||
                    suggestionMap.get(tx.payee.toLowerCase());
            }

            // Check split category match
            if (!matchedCatId && tx.splits.length > 0) {
                const firstCat = tx.splits[0]?.categoryId;
                if (firstCat) {
                    matchedCatId = suggestionMap.get(firstCat.toLowerCase());
                }
            }

            if (matchedCatId) {
                const targetCategoryId = matchedCatId;
                const updatedTx: ITransaction = {
                    ...tx,
                    splits: tx.splits.map(s => ({
                        ...s,
                        categoryId: targetCategoryId
                    })),
                    updatedAt: now
                };
                await this.ledgerStore.updateTransaction(updatedTx);
                updatedCount++;
            }
        }

        this.dismiss();
        return updatedCount;
    }

    /**
     * Cancels the current background matching job.
     */
    cancel(): void {
        this.cleanup();
        this.status.set('idle');
    }

    /**
     * Dismisses the results and resets the service to idle.
     */
    dismiss(): void {
        this.cleanup();
        this.status.set('idle');
        this.suggestions.set([]);
        this.targetTransactions.set([]);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private extractUnknownsFromTransactions(transactions: Array<ITransaction>): Array<string> {
        const unknowns = new Set<string>();
        const categories = this.ledgerStore.categories();
        const validCatIds = new Set(categories.map(c => c.id));

        for (const tx of transactions) {
            let isCategorized = false;
            for (const split of tx.splits) {
                if (
                    split.categoryId &&
                    validCatIds.has(split.categoryId) &&
                    split.categoryId !== 'cat-uncategorized'
                ) {
                    isCategorized = true;
                    break;
                }
            }

            if (!isCategorized && tx.payee) {
                unknowns.add(`Payee: ${tx.payee.trim()}`);
            }
        }

        return Array.from(unknowns);
    }

    private runInWorker(items: Array<string>, categories: Array<ICategory>, apiKey: string): void {
        this.worker = new Worker(
            new URL('../../workers/ai-auto-categorize.worker', import.meta.url),
            {
                type: 'module'
            }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): void => {
            this.zone.run(() => {
                const msg = event.data;
                if (msg.type === 'progress') {
                    this.progress.set({
                        pct: msg.pct,
                        processed: msg.processed,
                        total: msg.total,
                        message: msg.message
                    });
                } else if (msg.type === 'done') {
                    this.suggestions.set(msg.suggestions);
                    this.status.set('completed');
                    this.progress.update(p => ({ ...p, pct: 100 }));
                    this.cleanupWorker();
                } else if (msg.type === 'error') {
                    this.error.set({ message: msg.message, isQuota: msg.isQuota });
                    this.status.set('error');
                    this.cleanupWorker();
                }
            });
        };

        this.worker.onerror = (err): void => {
            this.zone.run(() => {
                this.error.set({ message: err.message || 'Worker error', isQuota: false });
                this.status.set('error');
                this.cleanupWorker();
            });
        };

        this.worker.postMessage({
            type: 'start',
            items,
            categories: categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId })),
            apiKey
        });
    }

    private async runInline(items: Array<string>, categories: Array<ICategory>): Promise<void> {
        this.abortController = new AbortController();
        const total = items.length;

        // Phase 1: Local regex heuristics
        this.progress.set({
            pct: 20,
            processed: 0,
            total,
            message: 'Running instant local heuristics...'
        });

        const heuristicMatches = matchUnknowns(items, categories);
        const suggs: Array<IAiCategorySuggestion> = [];
        const remaining: Array<string> = [];

        for (const item of items) {
            const matchId = heuristicMatches[item];
            if (matchId) {
                suggs.push({
                    unknownCategory: item,
                    matchedCategoryId: matchId,
                    confidence: 'high',
                    source: 'heuristic'
                });
            } else {
                remaining.push(item);
            }
        }

        const heuristicCount = suggs.length;
        this.progress.set({
            pct: Math.max(Math.round((heuristicCount / total) * 100), 20),
            processed: heuristicCount,
            total,
            message: `Matched ${heuristicCount} of ${total} via heuristics`
        });

        // Phase 2: If remaining and has key, run AI
        if (
            remaining.length > 0 &&
            this.geminiService.hasKey() &&
            !this.abortController.signal.aborted
        ) {
            try {
                this.progress.set({
                    pct: 60,
                    processed: heuristicCount,
                    total,
                    message: `AI analyzing ${remaining.length} remaining items...`
                });

                const categoriesContext = categories.map(c => `${c.name} [ID: ${c.id}]`).join('\n');
                const prompt = `
Financial Auto-Categorizer.
Categories:
${categoriesContext}

Items to Map:
${remaining.map(item => `- ${item}`).join('\n')}

Task: Match each item to the best Category ID or suggest a category name.
Respond ONLY with JSON:
{
  "mappings": [
    {
      "unknownCategory": "exact item string from the list above",
      "matchedCategoryId": "Category ID or null",
      "suggestedNewCategory": { "name": "Subcategory name or null", "parentName": "Parent name or null" }
    }
  ]
}
`;
                const rawResp = await this.geminiService.generateContent(prompt);
                const cleanJson = rawResp.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleanJson);

                if (parsed && Array.isArray(parsed.mappings)) {
                    for (const item of parsed.mappings) {
                        const raw = item.unknownCategory;
                        if (!raw) continue;
                        suggs.push({
                            unknownCategory: raw,
                            matchedCategoryId: item.matchedCategoryId || null,
                            suggestedNewCategory: item.suggestedNewCategory || null,
                            confidence: item.matchedCategoryId ? 'high' : 'medium',
                            source: 'ai'
                        });
                    }
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                const isQuota = message.includes('429') || message.toLowerCase().includes('quota');
                this.error.set({
                    message: message || 'AI generation failed',
                    isQuota
                });
            }
        }

        this.suggestions.set(suggs);
        this.progress.set({
            pct: 100,
            processed: suggs.length,
            total,
            message: 'Auto-categorization complete!'
        });
        this.status.set(this.error() && suggs.length === 0 ? 'error' : 'completed');
    }

    private cleanupWorker(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    private cleanup(): void {
        this.cleanupWorker();
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.timeoutReleaseFn) {
            this.timeoutReleaseFn();
            this.timeoutReleaseFn = null;
        }
    }
}
