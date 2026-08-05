import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ProgressBar } from 'primeng/progressbar';
import { Select } from 'primeng/select';
import { matchUnknowns } from '../../../core/utils/CategoryHeuristicMatcher';
import { GeminiService } from '../../../services/gemini/gemini.service';
import { ImportOrchestrationService } from '../../../services/import/import-orchestration.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';

export interface IAiMappingError {
    title: string;
    message: string;
    isQuota: boolean;
}

@Component({
    selector: 'category-mapping-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, Dialog, Button, Select, ProgressBar, PrimeTemplate],
    templateUrl: './category-mapping-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryMappingDialogComponent {
    readonly importService = inject(ImportOrchestrationService);
    readonly ledgerStore = inject(LedgerStore);
    readonly geminiService = inject(GeminiService);

    // Mappings: Unknown QIF Category String -> Internal Category ID
    readonly mappings = signal<Record<string, string>>({});

    // AI Progress & Error State
    readonly isAiLoading = signal<boolean>(false);
    readonly aiProgressPct = signal<number>(0);
    readonly aiStatusMessage = signal<string>('');
    readonly aiProcessedCount = signal<number>(0);
    readonly aiTotalCount = signal<number>(0);
    readonly aiError = signal<IAiMappingError | null>(null);

    private abortController: AbortController | null = null;

    cancelAiAutoMap(): void {
        console.warn('[CategoryMapping] AI Auto-Map execution canceled by user.');
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isAiLoading.set(false);
        this.aiStatusMessage.set('AI Auto-Mapping canceled. Partial mappings kept.');
    }

    dismissAiError(): void {
        this.aiError.set(null);
    }

    async runAiSuggest(): Promise<void> {
        if (this.isAiLoading() || !this.geminiService.hasKey()) return;

        this.aiError.set(null);
        const unknowns = this.importService.unknownCategories();
        const currentMappings = this.mappings();

        // Find unmapped items only
        const initialUnmapped = unknowns.filter(u => !currentMappings[u]);
        console.log('[CategoryMapping] runAiSuggest triggered.', {
            totalUnknowns: unknowns.length,
            currentlyMappedCount: Object.keys(currentMappings).length,
            unmappedToProcessCount: initialUnmapped.length,
            initialUnmapped
        });

        if (initialUnmapped.length === 0) {
            console.log('[CategoryMapping] All items already mapped. Skipping AI Auto-Map.');
            return;
        }

        this.isAiLoading.set(true);
        this.aiTotalCount.set(initialUnmapped.length);
        this.aiProcessedCount.set(0);
        this.aiProgressPct.set(0);

        this.abortController = new AbortController();
        const allCats = [...this.ledgerStore.categories()];

        // ── Phase 1: Fast Client-Side Deterministic Heuristics (0ms Latency) ────
        this.aiStatusMessage.set('Running instant local merchant pre-matching...');
        console.log('[CategoryMapping] Phase 1: Executing local heuristic matcher...');
        const heuristicMatches = matchUnknowns(initialUnmapped, allCats);
        const heuristicKeys = Object.keys(heuristicMatches);
        console.log('[CategoryMapping] Phase 1: Heuristics result:', {
            matchedCount: heuristicKeys.length,
            heuristicMatches
        });

        if (heuristicKeys.length > 0) {
            this.mappings.update(m => ({ ...m, ...heuristicMatches }));
            this.aiProcessedCount.set(heuristicKeys.length);
            this.aiProgressPct.set(
                Math.round((heuristicKeys.length / initialUnmapped.length) * 100)
            );
        }

        // Filter to items still needing AI inference
        const remainingUnmapped = initialUnmapped.filter(u => !this.mappings()[u]);
        console.log('[CategoryMapping] Items remaining after local heuristics:', {
            remainingCount: remainingUnmapped.length,
            remainingUnmapped
        });

        if (remainingUnmapped.length === 0) {
            console.log('[CategoryMapping] All items mapped via local heuristics. Finishing.');
            this.aiStatusMessage.set('All merchants mapped instantly via local smart matcher!');
            this.aiProgressPct.set(100);
            this.isAiLoading.set(false);
            return;
        }

        // ── Phase 2: Parallel Compressed LLM Engine ──────────────────────────────
        const categoriesContext = allCats.map(c => `${c.name} [ID: ${c.id}]`).join('\n');

        const GROUP_SIZE = 50;
        const CONCURRENCY = 3; // Process 3 groups in parallel
        const groups: Array<Array<string>> = [];

        for (let i = 0; i < remainingUnmapped.length; i += GROUP_SIZE) {
            groups.push(remainingUnmapped.slice(i, i + GROUP_SIZE));
        }

        console.log(
            `[CategoryMapping] Phase 2: Split ${remainingUnmapped.length} items into ${groups.length} groups of up to ${GROUP_SIZE} items.`
        );

        try {
            for (let g = 0; g < groups.length; g += CONCURRENCY) {
                if (this.abortController?.signal.aborted) break;

                const activeGroups = groups.slice(g, g + CONCURRENCY);
                const startNum = g + 1;
                const endNum = Math.min(g + CONCURRENCY, groups.length);

                const groupLabel =
                    startNum === endNum
                        ? `Group ${startNum} of ${groups.length}`
                        : `Groups ${startNum}-${endNum} of ${groups.length}`;

                this.aiStatusMessage.set(`AI analyzing items (${groupLabel})...`);
                console.log(
                    `[CategoryMapping] Phase 2: Dispatching ${activeGroups.length} concurrent LLM requests for ${groupLabel}...`
                );

                const groupPromises = activeGroups.map(async (chunk, chunkIdx) => {
                    const activeGroupIndex = g + chunkIdx + 1;
                    const prompt = `
Financial Auto-Categorizer.
Categories:
${categoriesContext}

Items to Map:
${chunk.map(item => `- ${item}`).join('\n')}

Task: Match each item to the best Category ID or suggest a category name.
IMPORTANT: "unknownCategory" in response MUST match the exact item string provided in the list above (including 'Payee: ' prefix if present).

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
                    console.log(`[CategoryMapping] Group ${activeGroupIndex} Prompt Sent:`, prompt);
                    const responseText = await this.geminiService.generateContent(prompt);
                    console.log(
                        `[CategoryMapping] Group ${activeGroupIndex} Raw Response:`,
                        responseText
                    );

                    const jsonText = responseText.replace(/```json|```/g, '').trim();
                    try {
                        const parsed = JSON.parse(jsonText);
                        console.log(
                            `[CategoryMapping] Group ${activeGroupIndex} Parsed JSON:`,
                            parsed
                        );
                        return { chunk, parsed };
                    } catch (pErr) {
                        console.error(
                            `[CategoryMapping] Group ${activeGroupIndex} JSON parse error:`,
                            pErr,
                            jsonText
                        );
                        return { chunk, parsed: null };
                    }
                });

                const results = await Promise.all(groupPromises);

                if (this.abortController?.signal.aborted) break;

                for (const { chunk, parsed } of results) {
                    if (parsed && Array.isArray(parsed.mappings)) {
                        for (const item of parsed.mappings) {
                            const rawUnknownStr = item.unknownCategory;
                            if (!rawUnknownStr) continue;

                            const cleanedStr = rawUnknownStr.replace(/^\d+[.)]\s*/, '').trim();

                            // Match against expected chunk items (exact or normalized)
                            let targetKey = chunk.find(
                                c => c === rawUnknownStr || c === cleanedStr
                            );
                            if (!targetKey) {
                                targetKey = chunk.find(
                                    c => c.toLowerCase() === cleanedStr.toLowerCase()
                                );
                            }
                            if (!targetKey) {
                                targetKey = chunk.find(
                                    c =>
                                        c.replace(/^Payee:\s*/i, '').toLowerCase() ===
                                        cleanedStr.replace(/^Payee:\s*/i, '').toLowerCase()
                                );
                            }
                            if (!targetKey) {
                                console.warn(
                                    `[CategoryMapping] Could not find target key in chunk for AI returned string: "${rawUnknownStr}". Defaulting to raw string.`
                                );
                                targetKey = rawUnknownStr;
                            }

                            const finalKey = targetKey || rawUnknownStr;

                            console.log(
                                `[CategoryMapping] Resolved mapping for item "${finalKey}" (AI returned "${rawUnknownStr}"):`,
                                item
                            );

                            if (item.matchedCategoryId) {
                                const exists = allCats.some(c => c.id === item.matchedCategoryId);
                                if (exists) {
                                    this.handleCategoryChange(finalKey, item.matchedCategoryId);
                                } else {
                                    console.warn(
                                        `[CategoryMapping] Matched category ID "${item.matchedCategoryId}" does not exist in store.`
                                    );
                                }
                            } else if (
                                item.suggestedNewCategory &&
                                item.suggestedNewCategory.name
                            ) {
                                const newCatName = item.suggestedNewCategory.name;
                                const newParentName = item.suggestedNewCategory.parentName;

                                let parentId: string | null = null;
                                if (newParentName) {
                                    const existingParent = allCats.find(
                                        c =>
                                            !c.parentId &&
                                            c.name.toLowerCase() === newParentName.toLowerCase()
                                    );
                                    if (existingParent) {
                                        parentId = existingParent.id;
                                    } else {
                                        console.log(
                                            `[CategoryMapping] Creating new parent category "${newParentName}"...`
                                        );
                                        const newParent = await this.ledgerStore.createCategory(
                                            newParentName,
                                            null
                                        );
                                        parentId = newParent.id;
                                        allCats.push(newParent);
                                    }
                                }

                                const existingChild = allCats.find(
                                    c =>
                                        c.parentId === parentId &&
                                        c.name.toLowerCase() === newCatName.toLowerCase()
                                );
                                let childId = '';
                                if (existingChild) {
                                    childId = existingChild.id;
                                } else {
                                    console.log(
                                        `[CategoryMapping] Creating new subcategory "${newCatName}" under parent "${newParentName || 'None'}"...`
                                    );
                                    const newChild = await this.ledgerStore.createCategory(
                                        newCatName,
                                        parentId
                                    );
                                    childId = newChild.id;
                                    allCats.push(newChild);
                                }

                                this.handleCategoryChange(finalKey, childId);
                            }
                        }
                    }
                }

                const mappedSoFar = Object.keys(this.mappings()).length;
                console.log(
                    `[CategoryMapping] Progress Update: ${mappedSoFar} of ${unknowns.length} total items mapped.`
                );
                this.aiProcessedCount.set(mappedSoFar);
                this.aiProgressPct.set(Math.round((mappedSoFar / initialUnmapped.length) * 100));
            }

            const finalUnknowns = this.importService.unknownCategories();
            const finalMapped = this.mappings();
            const unmappedLeftover = finalUnknowns.filter(u => !finalMapped[u]);

            console.log('[CategoryMapping] runAiSuggest Completed.', {
                isFullyMapped: this.isFullyMapped,
                totalUnknownsCount: finalUnknowns.length,
                totalMappedCount: Object.keys(finalMapped).length,
                unmappedLeftoverCount: unmappedLeftover.length,
                unmappedLeftover
            });

            if (!this.abortController?.signal.aborted) {
                this.aiStatusMessage.set('AI Auto-Mapping complete!');
                this.aiProgressPct.set(100);
            }
        } catch (err: unknown) {
            console.error('[CategoryMapping] Error occurred during runAiSuggest:', err);
            if (this.abortController?.signal.aborted) {
                return;
            }

            const errMsg = err instanceof Error ? err.message : String(err);
            const isQuota =
                errMsg.includes('429') ||
                errMsg.toLowerCase().includes('quota') ||
                errMsg.toLowerCase().includes('rate limit') ||
                errMsg.toLowerCase().includes('resource_exhausted');

            if (isQuota) {
                this.aiError.set({
                    title: 'AI Quota Limit Reached',
                    message: `Your AI service rate or quota limit was reached. Mapped ${this.aiProcessedCount()} of ${initialUnmapped.length} items. You can retry in a minute or map remaining items manually.`,
                    isQuota: true
                });
            } else {
                this.aiError.set({
                    title: 'AI Auto-Map Error',
                    message: `AI service encountered an error: ${errMsg}. Partial mappings up to this point have been preserved.`,
                    isQuota: false
                });
            }
        } finally {
            this.isAiLoading.set(false);
            this.abortController = null;
        }
    }

    readonly alphabetizedCategories = computed(() => {
        const allCats = this.ledgerStore.categories();

        // 1. Get top-level categories and sort them alphabetically
        const topLevel = allCats
            .filter(c => !c.parentId)
            .sort((a, b) => a.name.localeCompare(b.name));

        const result: Array<{
            id: string;
            name: string;
            isSubcategory: boolean;
            parentName?: string;
        }> = [];

        for (const parent of topLevel) {
            result.push({
                id: parent.id,
                name: parent.name,
                isSubcategory: false
            });

            // Get subcategories of this parent and sort them alphabetically
            const children = allCats
                .filter(c => c.parentId === parent.id)
                .sort((a, b) => a.name.localeCompare(b.name));

            for (const child of children) {
                result.push({
                    id: child.id,
                    name: child.name,
                    isSubcategory: true,
                    parentName: parent.name
                });
            }
        }

        return result;
    });

    handleCategoryChange(unknownString: string, categoryId: string | null): void {
        this.mappings.update(m => {
            if (categoryId) {
                return { ...m, [unknownString]: categoryId };
            } else {
                const { [unknownString]: _removed, ...rest } = m;
                return rest;
            }
        });
    }

    async handleConfirm(): Promise<void> {
        console.log('[CategoryMapping] handleConfirm clicked with mappings:', this.mappings());
        await this.importService.resolveUnknownCategories(this.mappings());
    }

    async handleIgnore(): Promise<void> {
        console.log('[CategoryMapping] handleIgnore clicked with mappings:', this.mappings());
        this.cancelAiAutoMap();
        await this.importService.resolveUnknownCategories(this.mappings(), true);
    }

    handleCancel(): void {
        console.log('[CategoryMapping] handleCancel clicked.');
        this.cancelAiAutoMap();
        this.importService.cancel();
    }

    get isFullyMapped(): boolean {
        const unknowns = this.importService.unknownCategories();
        const mapped = this.mappings();
        return unknowns.every(u => !!mapped[u]);
    }
}
