import type { IParsedTransaction, ITransaction } from '../domain/types';

export interface IReconciliationMatch {
    type: 'exact' | 'fuzzy' | 'none';
    parsedTx: IParsedTransaction;
    existingTxId?: string;
    confidence: number; // 0 to 1
}

/**
 * ReconciliationEngine handles matching external data (like parsed QIF) against existing ledger entries.
 * It is framework and database agnostic.
 */
export const ReconciliationEngine = {
    /**
     * Matches a list of parsed transactions against an existing set of transactions.
     *
     * @param parsedTransactions Transactions from an external source (e.g. QIF).
     * @param existingTransactions Existing transactions in the specific account.
     * @param options Configuration for matching sensitivity.
     */
    reconcile: (
        parsedTransactions: Array<IParsedTransaction>,
        existingTransactions: Array<
            ITransaction | { id: string; date: string; totalAmount: number; importHash: string }
        >,
        options: { fuzzyDateRangeDays: number } = { fuzzyDateRangeDays: 5 },
    ): Array<IReconciliationMatch> => {
        const results: Array<IReconciliationMatch> = [];

        for (const parsed of parsedTransactions) {
            // 1. Exact match by importHash
            const exactMatch = existingTransactions.find(tx => tx.importHash === parsed.importHash);
            if (exactMatch) {
                results.push({
                    type: 'exact',
                    parsedTx: parsed,
                    existingTxId: exactMatch.id,
                    confidence: 1.0,
                });
                continue;
            }

            // 2. Fuzzy match by Date (within range) and Amount (exact)
            // This handles manual entries vs cleared bank transactions.
            const fuzzyMatch = existingTransactions.find(tx => {
                const txDate = new Date(tx.date).getTime();
                const parsedDate = new Date(parsed.date).getTime();
                const dateDiff = Math.abs(txDate - parsedDate) / (1000 * 60 * 60 * 24);

                const amountMatch = tx.totalAmount === parsed.amount;

                return dateDiff <= options.fuzzyDateRangeDays && amountMatch;
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

            // 3. No match found
            results.push({
                type: 'none',
                parsedTx: parsed,
                confidence: 0,
            });
        }

        return results;
    },
};
