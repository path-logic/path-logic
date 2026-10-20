import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { IParsedTransaction } from '@core';
import { Money, QifClearedStatus, QIFParser } from '@core';
import { Button } from 'primeng/button';
import { AppShellComponent } from '../../../../components/layout/app-shell/app-shell.component';
import { LedgerStore } from '../../../../services/ledger-store/ledger.store';

interface IAnomaly {
    reason: string;
    transaction: IParsedTransaction;
}

export interface IQifImportDiagnostics {
    totalTransactions: number;
    netAmountCents: number;
    inflowsCents: number;
    outflowsCents: number;
    earliestDate: string | null;
    latestDate: string | null;
    statusDistribution: {
        clearedCount: number;
        clearedAmountCents: number;
        reconciledCount: number;
        reconciledAmountCents: number;
        unclearedCount: number;
        unclearedAmountCents: number;
    };
    postDated: {
        count: number;
        amountCents: number;
    };
    splits: {
        transactionCount: number;
        totalSplitsCount: number;
        mathMismatchCount: number;
    };
    transfers: {
        count: number;
        amountCents: number;
    };
    categories: {
        exactMatches: number;
        aliasMatches: number;
        unknownCount: number;
        unknownNames: Array<string>;
    };
    workflowComparison: {
        accountCreationStrict: {
            clearedCount: number;
            clearedAmountCents: number;
            pendingCount: number;
            pendingAmountCents: number;
        };
        accountCreationHistorical: {
            clearedCount: number;
            clearedAmountCents: number;
            pendingCount: number;
            pendingAmountCents: number;
        };
    };
}

@Component({
    selector: 'qif-test',
    standalone: true,
    imports: [CommonModule, Button, AppShellComponent],
    templateUrl: './qif-test.component.html',
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
    readonly diagnostics = signal<IQifImportDiagnostics | null>(null);
    readonly reportMarkdown = signal<string | null>(null);

    formatCurrency(cents: number): string {
        return Money.formatCurrency(cents);
    }

    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (!input?.files || input.files.length === 0) return;

        const file = input.files.item(0);
        if (!file) return;

        this.filename.set(file.name);
        this.isProcessing.set(true);
        this.reportMarkdown.set(null);
        this.anomalies.set([]);
        this.diagnostics.set(null);

        try {
            const content =
                typeof file.text === 'function'
                    ? await file.text()
                    : await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = (): void => resolve(reader.result as string);
                          reader.onerror = (): void => reject(reader.error);
                          reader.readAsText(file);
                      });
            this.analyzeQif(content);
        } catch (e) {
            console.error('Failed to read file', e);
        } finally {
            this.isProcessing.set(false);
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
        const todayIso = new Date().toISOString().split('T')[0] ?? '';

        const txs = result.transactions;
        const anomalies: Array<IAnomaly> = [];

        let netAmountCents = 0;
        let inflowsCents = 0;
        let outflowsCents = 0;

        let clearedCount = 0;
        let clearedAmountCents = 0;
        let reconciledCount = 0;
        let reconciledAmountCents = 0;
        let unclearedCount = 0;
        let unclearedAmountCents = 0;

        let postDatedCount = 0;
        let postDatedAmountCents = 0;

        let splitTxCount = 0;
        let totalSplitsCount = 0;
        let mathMismatchCount = 0;

        let transferCount = 0;
        let transferAmountCents = 0;

        let exactMatches = 0;
        let aliasMatches = 0;
        const unknownCategoryNames = new Set<string>();

        const dates: Array<string> = [];

        for (const tx of txs) {
            netAmountCents += tx.amount;
            if (tx.amount >= 0) {
                inflowsCents += tx.amount;
            } else {
                outflowsCents += tx.amount;
            }

            if (tx.date) {
                dates.push(tx.date);
                if (tx.date > todayIso) {
                    postDatedCount++;
                    postDatedAmountCents += tx.amount;
                }
            }

            // Cleared Status distribution
            if (tx.clearedStatus === QifClearedStatus.Cleared) {
                clearedCount++;
                clearedAmountCents += tx.amount;
            } else if (tx.clearedStatus === QifClearedStatus.Reconciled) {
                reconciledCount++;
                reconciledAmountCents += tx.amount;
            } else {
                unclearedCount++;
                unclearedAmountCents += tx.amount;
            }

            // Transfers
            const isTransfer =
                (tx.category?.startsWith('[') && tx.category?.endsWith(']')) ||
                tx.splits?.some(s => s.category?.startsWith('[') && s.category?.endsWith(']'));
            if (isTransfer) {
                transferCount++;
                transferAmountCents += tx.amount;
            }

            // Splits
            if (tx.splits && tx.splits.length > 0) {
                splitTxCount++;
                totalSplitsCount += tx.splits.length;

                const sumSplits = tx.splits.reduce((acc, s) => acc + s.amount, 0);
                if (sumSplits !== tx.amount) {
                    mathMismatchCount++;
                    anomalies.push({
                        reason: `Math Mismatch: Total Amount (${tx.amount}) !== Sum of Splits (${sumSplits})`,
                        transaction: tx
                    });
                }
            }

            // Category matching check
            const checkCat = (catRaw: string | null, context: string): void => {
                if (!catRaw) return;
                const paths = this.getCategorySearchPaths(catRaw);

                for (const path of paths) {
                    if (path === '[TRANSFER]') return;

                    const exactMatch = categories.find(
                        c => c.name.toLowerCase() === path.toLowerCase()
                    );
                    if (exactMatch) {
                        exactMatches++;
                        return;
                    }

                    const aliasMatch = this.ledgerStore.getCategoryAlias(path);
                    if (aliasMatch) {
                        aliasMatches++;
                        return;
                    }
                }

                unknownCategoryNames.add(catRaw);
                anomalies.push({
                    reason: `Unknown ${context} Category: "${catRaw}"`,
                    transaction: tx
                });
            };

            checkCat(tx.category, 'Main');
            if (tx.splits) {
                let sIdx = 1;
                for (const s of tx.splits) {
                    checkCat(s.category, `Split ${sIdx}`);
                    sIdx++;
                }
            }
        }

        dates.sort();
        const earliestDate = dates[0] ?? null;
        const latestDate = dates[dates.length - 1] ?? null;

        // Workflow Comparison Calculations:
        // 1. Strict: only explicit Cleared/Reconciled are Cleared
        const strictClearedCount = clearedCount + reconciledCount;
        const strictClearedAmount = clearedAmountCents + reconciledAmountCents;
        const strictPendingCount = unclearedCount;
        const strictPendingAmount = unclearedAmountCents;

        // 2. Historical: all transactions <= today are Cleared, only post-dated are Pending
        let histClearedCount = 0;
        let histClearedAmount = 0;
        let histPendingCount = 0;
        let histPendingAmount = 0;

        for (const tx of txs) {
            if (tx.date <= todayIso) {
                histClearedCount++;
                histClearedAmount += tx.amount;
            } else {
                histPendingCount++;
                histPendingAmount += tx.amount;
            }
        }

        const diag: IQifImportDiagnostics = {
            totalTransactions: txs.length,
            netAmountCents,
            inflowsCents,
            outflowsCents,
            earliestDate,
            latestDate,
            statusDistribution: {
                clearedCount,
                clearedAmountCents,
                reconciledCount,
                reconciledAmountCents,
                unclearedCount,
                unclearedAmountCents
            },
            postDated: {
                count: postDatedCount,
                amountCents: postDatedAmountCents
            },
            splits: {
                transactionCount: splitTxCount,
                totalSplitsCount,
                mathMismatchCount
            },
            transfers: {
                count: transferCount,
                amountCents: transferAmountCents
            },
            categories: {
                exactMatches,
                aliasMatches,
                unknownCount: unknownCategoryNames.size,
                unknownNames: Array.from(unknownCategoryNames)
            },
            workflowComparison: {
                accountCreationStrict: {
                    clearedCount: strictClearedCount,
                    clearedAmountCents: strictClearedAmount,
                    pendingCount: strictPendingCount,
                    pendingAmountCents: strictPendingAmount
                },
                accountCreationHistorical: {
                    clearedCount: histClearedCount,
                    clearedAmountCents: histClearedAmount,
                    pendingCount: histPendingCount,
                    pendingAmountCents: histPendingAmount
                }
            }
        };

        this.diagnostics.set(diag);
        this.anomalies.set(anomalies);
        this.generateMarkdown(diag, anomalies, result.errors);
    }

    private generateMarkdown(
        diag: IQifImportDiagnostics,
        anomalies: Array<IAnomaly>,
        errors: Array<unknown>
    ): void {
        let md = `# QIF Import Statistical & Diagnostic Report\n\n`;
        md += `## 1. Summary & Volume\n`;
        md += `- **Total Transactions:** ${diag.totalTransactions}\n`;
        md += `- **Net Amount:** ${this.formatCurrency(diag.netAmountCents)}\n`;
        md += `- **Total Inflows:** ${this.formatCurrency(diag.inflowsCents)}\n`;
        md += `- **Total Outflows:** ${this.formatCurrency(diag.outflowsCents)}\n`;
        md += `- **Date Span:** ${diag.earliestDate || 'N/A'} to ${diag.latestDate || 'N/A'}\n\n`;

        md += `## 2. Status Distribution (Explicit File Tags)\n`;
        md += `- **Explicit Cleared (C* / Cc):** ${diag.statusDistribution.clearedCount} transactions (${this.formatCurrency(diag.statusDistribution.clearedAmountCents)})\n`;
        md += `- **Explicit Reconciled (CX / CR):** ${diag.statusDistribution.reconciledCount} transactions (${this.formatCurrency(diag.statusDistribution.reconciledAmountCents)})\n`;
        md += `- **Unmarked / Uncleared (Pending):** ${diag.statusDistribution.unclearedCount} transactions (${this.formatCurrency(diag.statusDistribution.unclearedAmountCents)})\n`;
        if (diag.postDated.count > 0) {
            md += `- **Post-Dated / Next Business Day:** ${diag.postDated.count} transactions (${this.formatCurrency(diag.postDated.amountCents)}) [Preserved as tagged in file]\n`;
        }
        md += `\n`;

        md += `## 3. Workflow Comparison: How Data is Handled\n`;
        md += `### A. Account Creation Import (Initial Seed)\n`;
        md += `- **Strict File Tags:** ${diag.workflowComparison.accountCreationStrict.clearedCount} Cleared (${this.formatCurrency(diag.workflowComparison.accountCreationStrict.clearedAmountCents)}) | ${diag.workflowComparison.accountCreationStrict.pendingCount} Pending (${this.formatCurrency(diag.workflowComparison.accountCreationStrict.pendingAmountCents)})\n`;
        md += `- **Historical Seed (<= Today Cleared):** ${diag.workflowComparison.accountCreationHistorical.clearedCount} Cleared (${this.formatCurrency(diag.workflowComparison.accountCreationHistorical.clearedAmountCents)}) | ${diag.workflowComparison.accountCreationHistorical.pendingCount} Pending (${this.formatCurrency(diag.workflowComparison.accountCreationHistorical.pendingAmountCents)})\n\n`;

        md += `### B. Ongoing Reconciliation Import\n`;
        md += `- Matches existing pending transactions by date, amount, and payee hash.\n`;
        md += `- Advances matched pending transactions to **Cleared**.\n`;
        md += `- Flags duplicates via SHA-256 importHash to prevent double-entry.\n\n`;

        md += `## 4. Structure & Categorization\n`;
        md += `- **Split Transactions:** ${diag.splits.transactionCount} (${diag.splits.totalSplitsCount} total splits)\n`;
        md += `- **Split Math Mismatches:** ${diag.splits.mathMismatchCount}\n`;
        md += `- **Transfers Detected:** ${diag.transfers.count} (${this.formatCurrency(diag.transfers.amountCents)})\n`;
        md += `- **Category Match Rate:** ${diag.categories.exactMatches} exact, ${diag.categories.aliasMatches} alias, ${diag.categories.unknownCount} unknown\n\n`;

        if (errors.length > 0) {
            md += `## 5. Parser Errors\n\`\`\`json\n${JSON.stringify(errors, null, 2)}\n\`\`\`\n\n`;
        }

        if (anomalies.length > 0) {
            md += `## 6. Anomalies (${anomalies.length} Detected)\n\n`;
            anomalies.forEach((a, index) => {
                md += `### ${index + 1}. ${a.reason}\n`;
                md += `\`\`\`json\n${JSON.stringify(a.transaction, null, 2)}\n\`\`\`\n\n`;
            });
        } else {
            md += `*No unknown categories or math mismatches detected!*\n`;
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
