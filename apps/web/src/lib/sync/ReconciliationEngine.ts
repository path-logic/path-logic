import type { Database } from 'sql.js';
import type { IParsedTransaction } from '@path-logic/core';

export interface IReconciliationMatch {
    type: 'exact' | 'fuzzy' | 'none';
    parsedTx: IParsedTransaction;
    existingTxId?: string;
    confidence: number; // 0 to 1
}

/**
 * ReconciliationEngine handles matching external data (QIF) against the local ledger.
 */
export class ReconciliationEngine {
    /**
     * Matches a list of parsed transactions against the database.
     */
    public static async reconcile(
        db: Database,
        parsedTransactions: Array<IParsedTransaction>,
        accountId: string,
    ): Promise<Array<IReconciliationMatch>> {
        const results: Array<IReconciliationMatch> = [];

        // 1. Get all existing transactions for this account for fuzzy matching
        // (We might want to limit this to a date range for performance)
        const existingTxsResult = db.exec(
            `
            SELECT id, date, totalAmount, payee, importHash 
            FROM transactions 
            WHERE accountId = ? AND isDeleted = 0
        `,
            [accountId],
        );

        const existingTxs = (existingTxsResult[0]?.values || []).map(row => ({
            id: row[0] as string,
            date: row[1] as string,
            amount: row[2] as number,
            payee: row[3] as string,
            importHash: row[4] as string,
        }));

        for (const parsed of parsedTransactions) {
            // A. Exact match by importHash
            const exactMatch = existingTxs.find(tx => tx.importHash === parsed.importHash);
            if (exactMatch) {
                results.push({
                    type: 'exact',
                    parsedTx: parsed,
                    existingTxId: exactMatch.id,
                    confidence: 1.0,
                });
                continue;
            }

            // B. Fuzzy match by Date (+/- 5 days) and Amount (exact)
            // This handles cases where the user manual entered a transaction and the bank cleared it on a different date.
            const fuzzyMatch = existingTxs.find(tx => {
                const dateDiff =
                    Math.abs(new Date(tx.date).getTime() - new Date(parsed.date).getTime()) /
                    (1000 * 60 * 60 * 24);

                return dateDiff <= 5 && tx.amount === parsed.amount;
            });

            if (fuzzyMatch) {
                results.push({
                    type: 'fuzzy',
                    parsedTx: parsed,
                    existingTxId: fuzzyMatch.id,
                    confidence: 0.8,
                });
                continue;
            }

            // C. No match
            results.push({
                type: 'none',
                parsedTx: parsed,
                confidence: 0,
            });
        }

        return results;
    }
}
