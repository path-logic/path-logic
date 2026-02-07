import type { Database } from 'sql.js';
import {
    type IParsedTransaction,
    ReconciliationEngine as CoreReconciliationEngine,
    type IReconciliationMatch,
} from '@path-logic/core';

export type { IReconciliationMatch };

/**
 * ReconciliationEngine handles matching external data (QIF) against the local ledger.
 * This version uses SQL.js to fetch existing transactions then delegates matching to core.
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
        // 1. Get all existing transactions for this account
        const existingTxsResult = db.exec(
            `
            SELECT id, date, totalAmount, importHash 
            FROM transactions 
            WHERE accountId = ? AND isDeleted = 0
        `,
            [accountId],
        );

        const existingTxs = (existingTxsResult[0]?.values || []).map(row => ({
            id: row[0] as string,
            date: row[1] as string,
            totalAmount: row[2] as number,
            importHash: row[3] as string,
        }));

        // 2. Delegate matching to core engine
        return CoreReconciliationEngine.reconcile(parsedTransactions, existingTxs);
    }
}
