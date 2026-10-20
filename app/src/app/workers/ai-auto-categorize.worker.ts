/**
 * @file ai-auto-categorize.worker.ts
 * Web Worker for off-thread AI auto-categorization and heuristic matching.
 */

import { matchUnknowns } from '../core/utils/CategoryHeuristicMatcher';
import type {
    IAiCategorySuggestion,
    WorkerInboundMessage,
    WorkerOutboundMessage
} from '../services/ai-auto-categorize/ai-auto-categorize.types';

let isCancelled = false;

function post(msg: WorkerOutboundMessage): void {
    self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>): Promise<void> => {
    const msg = event.data;

    if (msg.type === 'cancel') {
        isCancelled = true;
        return;
    }

    if (msg.type !== 'start') return;

    isCancelled = false;
    const { items, categories, apiKey } = msg;

    try {
        const total = items.length;
        if (total === 0) {
            post({ type: 'done', suggestions: [] });
            return;
        }

        post({
            type: 'progress',
            pct: 5,
            processed: 0,
            total,
            message: 'Running fast local heuristics...'
        });

        // ── Phase 1: Off-thread regex heuristics ─────────────────────────────
        const heuristicMatches = matchUnknowns(items, categories);
        const suggestions: Array<IAiCategorySuggestion> = [];
        const remainingItems: Array<string> = [];

        for (const item of items) {
            const matchedId = heuristicMatches[item];
            if (matchedId) {
                suggestions.push({
                    unknownCategory: item,
                    matchedCategoryId: matchedId,
                    confidence: 'high',
                    source: 'heuristic'
                });
            } else {
                remainingItems.push(item);
            }
        }

        const heuristicCount = suggestions.length;
        const initialPct = Math.round((heuristicCount / total) * 100);

        post({
            type: 'progress',
            pct: Math.max(initialPct, 10),
            processed: heuristicCount,
            total,
            message: `Matched ${heuristicCount} of ${total} via smart local heuristics`
        });

        if (remainingItems.length === 0 || isCancelled) {
            post({ type: 'done', suggestions });
            return;
        }

        // If no API key provided, finish with heuristic matches only
        if (!apiKey) {
            post({ type: 'done', suggestions });
            return;
        }

        // ── Phase 2: Bounded Concurrency LLM Batching ─────────────────────────
        const GROUP_SIZE = 40;
        const CONCURRENCY = 2; // Bounded to 2 concurrent requests to avoid 429 quota exhaustion
        const groups: Array<Array<string>> = [];

        for (let i = 0; i < remainingItems.length; i += GROUP_SIZE) {
            groups.push(remainingItems.slice(i, i + GROUP_SIZE));
        }

        const categoriesContext = categories.map(c => `${c.name} [ID: ${c.id}]`).join('\n');

        for (let g = 0; g < groups.length; g += CONCURRENCY) {
            if (isCancelled) break;

            const activeGroups = groups.slice(g, g + CONCURRENCY);
            const currentGroupNum = g + 1;
            const endGroupNum = Math.min(g + CONCURRENCY, groups.length);

            post({
                type: 'progress',
                pct: Math.min(95, Math.round((suggestions.length / total) * 100)),
                processed: suggestions.length,
                total,
                message: `AI analyzing batch ${currentGroupNum}-${endGroupNum} of ${groups.length}...`
            });

            const groupPromises = activeGroups.map(async chunk => {
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

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json' }
                    })
                });

                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    const isQuota = res.status === 429 || errText.toLowerCase().includes('quota');
                    throw { message: `AI request failed (${res.status}): ${errText}`, isQuota };
                }

                const data = await res.json();
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                const cleanJson = rawText.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                return { chunk, parsed };
            });

            const results = await Promise.all(groupPromises);

            for (const { chunk, parsed } of results) {
                if (parsed && Array.isArray(parsed.mappings)) {
                    for (const item of parsed.mappings) {
                        const rawUnknown = item.unknownCategory;
                        if (!rawUnknown) continue;

                        const cleaned = rawUnknown.replace(/^\d+[.)]\s*/, '').trim();
                        let targetKey = chunk.find(c => c === rawUnknown || c === cleaned);
                        if (!targetKey) {
                            targetKey = chunk.find(c => c.toLowerCase() === cleaned.toLowerCase());
                        }
                        const finalKey = targetKey || rawUnknown;

                        suggestions.push({
                            unknownCategory: finalKey,
                            matchedCategoryId: item.matchedCategoryId || null,
                            suggestedNewCategory: item.suggestedNewCategory || null,
                            confidence: item.matchedCategoryId ? 'high' : 'medium',
                            source: 'ai'
                        });
                    }
                }
            }
        }

        post({
            type: 'progress',
            pct: 100,
            processed: suggestions.length,
            total,
            message: 'Auto-categorization complete!'
        });

        post({ type: 'done', suggestions });
    } catch (err: unknown) {
        if (!isCancelled) {
            const message = err instanceof Error ? err.message : String(err);
            const isQuota =
                typeof err === 'object' && err !== null && 'isQuota' in err
                    ? Boolean((err as { isQuota: boolean }).isQuota)
                    : false;
            post({
                type: 'error',
                message: message || 'Worker auto-categorization failed',
                isQuota
            });
        }
    }
};
