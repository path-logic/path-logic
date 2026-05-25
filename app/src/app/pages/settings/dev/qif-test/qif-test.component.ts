import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { IParsedSplit, IParsedTransaction } from '@core';
import { QIFParser } from '@core';
import { Button } from 'primeng/button';
import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';
interface IAnomaly {
    reason: string;
    transaction: IParsedTransaction;
}

@Component({
    selector: 'qif-test',
    standalone: true,
    imports: [CommonModule, Button, AppShellComponent],
    template: `
        <shell>
            <div class="p-8 space-y-8">
                <header class="border-b border-surface-200/30 pb-4">
                    <h1 class="text-xl font-black uppercase tracking-[0.2em] mb-2 text-primary">
                        QIF Import <span class="text-surface-800">Diagnostics</span>
                    </h1>
                    <p
                        class="text-surface-500 text-[10px] uppercase font-bold tracking-[0.2em] opacity-60"
                    >
                        Parse and validate QIF files without saving to the ledger.
                    </p>
                </header>

                <div class="space-y-4">
                    <div class="flex items-center gap-4">
                        <label class="cursor-pointer">
                            <input
                                type="file"
                                accept=".qif"
                                class="hidden"
                                (change)="onFileSelected($event)"
                            />
                            <span
                                class="px-4 py-2 text-xs font-black uppercase tracking-widest bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                            >
                                Upload QIF File
                            </span>
                        </label>
                        <span class="text-xs text-surface-500 font-bold uppercase tracking-widest">
                            {{ filename() || 'No file selected' }}
                        </span>
                    </div>
                </div>

                @if (isProcessing()) {
                    <div class="flex items-center gap-3">
                        <i class="pi pi-spin pi-spinner text-primary"></i>
                        <span class="text-xs font-bold text-surface-500 uppercase tracking-widest"
                            >Analyzing file...</span
                        >
                    </div>
                }

                @if (reportMarkdown()) {
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h2
                                class="text-sm font-black uppercase tracking-widest text-surface-800"
                            >
                                Diagnostic Report ({{ anomalies().length }} Anomalies)
                            </h2>
                            <p-button
                                label="Copy Report"
                                icon="pi pi-copy"
                                size="small"
                                [outlined]="true"
                                (click)="copyReport()"
                            ></p-button>
                        </div>

                        <div
                            class="bg-surface-50 border border-surface-200 rounded p-4 overflow-auto max-h-[600px]"
                        >
                            <pre
                                class="text-[10px] font-mono text-surface-700 whitespace-pre-wrap"
                                >{{ reportMarkdown() }}</pre
                            >
                        </div>
                    </div>
                }
            </div>
        </shell>
    `,
    styles: [
        `
            :host {
                display: block;
            }
        `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QifTestComponent {
    private readonly ledgerStore = inject(LedgerStore);

    readonly filename = signal<string | null>(null);
    readonly isProcessing = signal<boolean>(false);
    readonly anomalies = signal<Array<IAnomaly>>([]);
    readonly reportMarkdown = signal<string | null>(null);

    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (!input?.files || input.files.length === 0) return;

        const file = input.files.item(0);
        if (!file) return;

        this.filename.set(file.name);
        this.isProcessing.set(true);
        this.reportMarkdown.set(null);
        this.anomalies.set([]);

        try {
            const content = await file.text();
            this.analyzeQif(content);
        } catch (e) {
            console.error('Failed to read file', e);
        } finally {
            this.isProcessing.set(false);
            // Reset input so the same file can be selected again
            input.value = '';
        }
    }

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

    private analyzeQif(content: string): void {
        const parser = new QIFParser();
        const result = parser.parse(content);
        const categories = this.ledgerStore.categories();

        const anomalies: Array<IAnomaly> = [];

        for (const tx of result.transactions) {
            let hasIssue = false;
            const reasons: Array<string> = [];

            const checkCat = (catRaw: string | null, context: string): void => {
                if (!catRaw) return;
                const paths = this.getCategorySearchPaths(catRaw);

                for (const path of paths) {
                    if (path === '[TRANSFER]') return;

                    // 1. Exact match
                    const exactMatch = categories.find(
                        c => c.name.toLowerCase() === path.toLowerCase()
                    );
                    if (exactMatch) return;

                    // 2. Alias match
                    const aliasMatch = this.ledgerStore.getCategoryAlias(path);
                    if (aliasMatch) return;
                }

                hasIssue = true;
                reasons.push(
                    `Unknown ${context} Category: "${catRaw}" (Tried: ${paths.join(', ')})`
                );
            };

            checkCat(tx.category, 'Main');
            const splits = tx.splits || [];
            let splitIdx = 1;
            for (const split of splits) {
                checkCat(split.category, `Split ${splitIdx}`);
                splitIdx++;
            }

            // Check math for splits
            if (tx.splits && tx.splits.length > 0) {
                const sumSplits = tx.splits.reduce(
                    (acc: number, s: IParsedSplit) => acc + s.amount,
                    0
                );
                if (sumSplits !== tx.amount) {
                    hasIssue = true;
                    reasons.push(
                        `Math Mismatch: Total Amount (${tx.amount}) !== Sum of Splits (${sumSplits})`
                    );
                }
            }

            if (hasIssue) {
                anomalies.push({
                    reason: reasons.join(' | '),
                    transaction: tx
                });
            }
        }

        this.anomalies.set(anomalies);
        this.generateMarkdown(result.transactions.length, anomalies, result.errors);
    }

    private generateMarkdown(
        totalTxs: number,
        anomalies: Array<IAnomaly>,
        errors: Array<unknown>
    ): void {
        let md = `# QIF Import Diagnostic Report\n\n`;
        md += `- **Total Transactions Parsed:** ${totalTxs}\n`;
        md += `- **Anomalies Detected:** ${anomalies.length}\n`;
        md += `- **Parser Errors:** ${errors.length}\n\n`;

        if (errors.length > 0) {
            md += `## Parser Errors\n\n` + JSON.stringify(errors, null, 2) + '\n\n';
        }

        if (anomalies.length === 0) {
            md += `*No unknown categories or math mismatches found!*\n`;
        } else {
            md += `## Anomalous Transactions\n\n`;
            anomalies.forEach((a, index) => {
                md += `### ${index + 1}. ${a.reason}\n`;
                md += `\`\`\`json\n`;
                md += JSON.stringify(a.transaction, null, 2) + '\n';
                md += `\`\`\`\n\n`;
            });
        }

        this.reportMarkdown.set(md);
    }

    async copyReport(): Promise<void> {
        const md = this.reportMarkdown();
        if (md) {
            try {
                await navigator.clipboard.writeText(md);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        }
    }
}
