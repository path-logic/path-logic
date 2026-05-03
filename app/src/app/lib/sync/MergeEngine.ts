import type { Database, SqlValue } from 'sql.js';

import { SQL_QUERIES } from '../storage/SQLiteAdapter';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Both sides of a conflicting transaction.
 * "mine" = local version, "theirs" = remote (Drive) version.
 *
 * A true conflict occurs when BOTH local and remote updatedAt timestamps
 * are newer than the last Drive sync time. LWW cannot auto-resolve these
 * without potentially discarding user intent, so they are surfaced in the
 * conflict resolution modal.
 */
export interface ITransactionConflict {
    id: string;
    mine: IConflictSide;
    theirs: IConflictSide;
}

export interface IConflictSide {
    date: string;
    payee: string;
    totalAmount: number; // in cents
    memo: string | null;
    status: string;
    checkNumber: string | null;
    accountId: string;
    payeeId: string;
    importHash: string | null;
    updatedAt: string;
}

/**
 * Result returned by mergeRemoteIntoLocal().
 */
export interface IMergeResult {
    /** Records where remote was newer and was silently applied (LWW). */
    mergedCount: number;
    /** Transactions where BOTH sides changed since last Drive sync. */
    conflicts: Array<ITransactionConflict>;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface IMergeable {
    id: string;
    updatedAt: string;
    isDeleted: number;
    clientId: string;
    createdAt?: string;
    accountId?: string;
    payeeId?: string;
    date?: string;
    payee?: string;
    memo?: string;
    totalAmount?: number;
    status?: string;
    checkNumber?: string | null;
    importHash?: string;
    categoryId?: string;
    transactionId?: string;
    scheduleId?: string;
    name?: string;
    type?: string;
    institutionName?: string;
    isActive?: number;
    deletedAt?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
    website?: string;
    phone?: string;
    notes?: string;
    defaultCategoryId?: string;
    parentId?: string;
    description?: string;
    frequency?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    nextDueDate?: string;
    lastOccurredDate?: string;
    autoPost?: number;
    amount?: number;
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * SQLiteMergeEngine handles the logical merging of two Path Logic databases.
 *
 * Strategy:
 *   - New remote records → inserted locally (no conflict)
 *   - Remote newer than lastSyncTime, local unchanged → LWW: apply remote
 *   - BOTH modified since lastSyncTime → conflict: return to caller for resolution
 *   - Local newer, remote unchanged → keep local (no action)
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SQLiteMergeEngine {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    /**
     * Merges a remote database into the local one.
     *
     * @param remoteDb       The remote Drive database instance
     * @param localDb        The local (primary) database instance
     * @param lastSyncTime   Unix ms timestamp of the last successful Drive sync.
     *                       Pass 0 on first sync (treats all remote records as newer).
     * @returns IMergeResult with the count of auto-merged records and any conflicts.
     */
    public static async mergeRemoteIntoLocal(
        remoteDb: Database,
        localDb: Database,
        lastSyncTime: number = 0
    ): Promise<IMergeResult> {
        let mergedCount = 0;
        const conflicts: Array<ITransactionConflict> = [];

        // Merge in dependency order:
        // 1. Categories (referenced by payees, splits, schedules)
        // 2. Payees (referenced by transactions, schedules)
        // 3. Accounts (referenced by transactions, schedules)
        // 4. Transactions & Splits
        // 5. Recurring Schedules & Splits

        mergedCount += this.mergeTable(
            remoteDb,
            localDb,
            'categories',
            this.mapCategory,
            lastSyncTime
        );
        mergedCount += this.mergeTable(remoteDb, localDb, 'payees', this.mapPayee, lastSyncTime);
        mergedCount += this.mergeTable(
            remoteDb,
            localDb,
            'accounts',
            this.mapAccount,
            lastSyncTime
        );

        const txResult = this.mergeTransactions(remoteDb, localDb, lastSyncTime);
        mergedCount += txResult.mergedCount;
        conflicts.push(...txResult.conflicts);

        mergedCount += this.mergeRecurringSchedules(remoteDb, localDb, lastSyncTime);

        return { mergedCount, conflicts };
    }

    // ── Generic flat-table merger ─────────────────────────────────────────────

    private static mergeTable<T extends IMergeable>(
        remoteDb: Database,
        localDb: Database,
        tableName: string,
        mapper: (row: Array<SqlValue>) => T,
        lastSyncTime: number
    ): number {
        let mergedCount = 0;

        const remoteResult = remoteDb.exec(`SELECT * FROM ${tableName} `);
        if (remoteResult.length === 0 || !remoteResult[0]) return 0;

        for (const row of remoteResult[0].values) {
            if (!row) continue;
            const remoteItem = mapper(row);

            const localResult = localDb.exec(`SELECT * FROM ${tableName} WHERE id = ? `, [
                remoteItem.id
            ]);

            if (localResult.length === 0 || !localResult[0] || localResult[0].values.length === 0) {
                // New record from remote — insert
                this.insertItem(localDb, tableName, remoteItem);
                mergedCount++;
                continue;
            }

            const localRow = localResult[0].values[0];
            if (!localRow) continue;
            const localItem = mapper(localRow);

            const remoteMs = new Date(remoteItem.updatedAt).getTime();
            const localMs = new Date(localItem.updatedAt).getTime();

            if (remoteMs > lastSyncTime && localMs <= lastSyncTime) {
                // Remote changed since last sync, local unchanged → apply remote
                this.updateItem(localDb, tableName, remoteItem);
                mergedCount++;
            }
            // else: local is newer or both equal → keep local
        }

        return mergedCount;
    }

    // ── Transaction merger (with conflict detection) ──────────────────────────

    private static mergeTransactions(
        remoteDb: Database,
        localDb: Database,
        lastSyncTime: number
    ): { mergedCount: number; conflicts: Array<ITransactionConflict> } {
        let mergedCount = 0;
        const conflicts: Array<ITransactionConflict> = [];

        const remoteResult = remoteDb.exec(`SELECT * FROM transactions`);
        if (remoteResult.length === 0 || !remoteResult[0]) return { mergedCount, conflicts };

        for (const row of remoteResult[0].values) {
            if (!row) continue;
            const remoteTx = this.mapTransaction(row);

            const localResult = localDb.exec(`SELECT * FROM transactions WHERE id = ? `, [
                remoteTx.id
            ]);
            const existsLocally =
                localResult.length > 0 &&
                localResult[0] !== undefined &&
                localResult[0].values.length > 0;

            if (!existsLocally) {
                // New transaction from remote — insert directly
                this.applyTransaction(localDb, remoteTx, remoteDb);
                mergedCount++;
                continue;
            }

            const localRow = localResult[0]?.values[0];
            if (!localRow) continue;
            const localTx = this.mapTransaction(localRow);
            const remoteMs = new Date(remoteTx.updatedAt).getTime();
            const localMs = new Date(localTx.updatedAt).getTime();

            const remoteChangedSinceSync = remoteMs > lastSyncTime;
            const localChangedSinceSync = localMs > lastSyncTime;

            if (remoteChangedSinceSync && localChangedSinceSync) {
                // ── True conflict: BOTH sides changed since last Drive sync ──
                // Surface to user for resolution instead of silently discarding.
                conflicts.push({
                    id: remoteTx.id,
                    mine: this.toConflictSide(localTx),
                    theirs: this.toConflictSide(remoteTx)
                });
            } else if (remoteChangedSinceSync && !localChangedSinceSync) {
                // Remote changed, local unchanged → apply remote (LWW)
                this.applyTransaction(localDb, remoteTx, remoteDb);
                mergedCount++;
            }
            // else: local changed or both equal → keep local
        }

        return { mergedCount, conflicts };
    }

    // ── Recurring schedule merger ─────────────────────────────────────────────

    private static mergeRecurringSchedules(
        remoteDb: Database,
        localDb: Database,
        lastSyncTime: number
    ): number {
        let mergedCount = 0;

        const remoteResult = remoteDb.exec(`SELECT * FROM recurring_schedules`);
        if (remoteResult.length === 0 || !remoteResult[0]) return 0;

        for (const row of remoteResult[0].values) {
            if (!row) continue;
            const remoteSchedule = this.mapSchedule(row);

            const localResult = localDb.exec(
                `SELECT updatedAt, isDeleted FROM recurring_schedules WHERE id = ? `,
                [remoteSchedule.id]
            );
            const existsLocally =
                localResult.length > 0 &&
                localResult[0] !== undefined &&
                localResult[0].values.length > 0;

            if (!existsLocally) {
                this.applySchedule(localDb, remoteSchedule, remoteDb);
                mergedCount++;
                continue;
            }

            const results = localResult[0];
            if (results && results.values.length > 0) {
                const localRow = results.values[0];
                if (localRow && localRow[0]) {
                    const localMs = new Date(localRow[0] as string).getTime();
                    const remoteMs = new Date(remoteSchedule.updatedAt).getTime();

                    if (remoteMs > lastSyncTime && localMs <= lastSyncTime) {
                        this.applySchedule(localDb, remoteSchedule, remoteDb);
                        mergedCount++;
                    }
                }
            }
        }

        return mergedCount;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static toConflictSide(tx: IMergeable): IConflictSide {
        return {
            date: tx.date ?? '',
            payee: tx.payee ?? '',
            totalAmount: tx.totalAmount ?? 0,
            memo: tx.memo ?? null,
            status: tx.status ?? '',
            checkNumber: tx.checkNumber ?? null,
            accountId: tx.accountId ?? '',
            payeeId: tx.payeeId ?? '',
            importHash: tx.importHash ?? null,
            updatedAt: tx.updatedAt
        };
    }

    private static applyTransaction(
        localDb: Database,
        remoteTx: IMergeable,
        remoteDb: Database
    ): void {
        const remoteSplitsResult = remoteDb.exec(`SELECT * FROM splits WHERE transaction_id = ? `, [
            remoteTx.id
        ]);
        const remoteSplits = (remoteSplitsResult[0]?.values || [])
            .filter((r): r is Array<SqlValue> => r !== null)
            .map(r => this.mapSplit(r));

        localDb.run(
            SQL_QUERIES.INSERT_TRANSACTION.replace('INSERT INTO', 'INSERT OR REPLACE INTO'),
            [
                remoteTx.id,
                remoteTx.accountId as SqlValue,
                remoteTx.payeeId as SqlValue,
                remoteTx.date as SqlValue,
                remoteTx.payee as SqlValue,
                remoteTx.memo as SqlValue,
                remoteTx.totalAmount as SqlValue,
                remoteTx.status as SqlValue,
                remoteTx.checkNumber as SqlValue,
                remoteTx.importHash as SqlValue,
                remoteTx.isDeleted,
                remoteTx.clientId,
                remoteTx.createdAt ?? null,
                remoteTx.updatedAt
            ]
        );

        localDb.run('DELETE FROM splits WHERE transaction_id = ?', [remoteTx.id]);
        for (const split of remoteSplits) {
            localDb.run(SQL_QUERIES.INSERT_SPLIT, [
                split.id,
                remoteTx.id,
                split.categoryId as SqlValue,
                split.memo as SqlValue,
                split.amount as SqlValue,
                split.isDeleted,
                split.clientId,
                split.updatedAt
            ]);
        }
    }

    private static applySchedule(
        localDb: Database,
        remoteSchedule: IMergeable,
        remoteDb: Database
    ): void {
        const remoteSplitsResult = remoteDb.exec(
            `SELECT * FROM recurring_splits WHERE schedule_id = ? `,
            [remoteSchedule.id]
        );
        const remoteSplits = (remoteSplitsResult[0]?.values || [])
            .filter((r): r is Array<SqlValue> => r !== null)
            .map(r => this.mapRecurringSplit(r));

        localDb.run(
            SQL_QUERIES.INSERT_RECURRING_SCHEDULE.replace('INSERT INTO', 'INSERT OR REPLACE INTO'),
            [
                remoteSchedule.id,
                remoteSchedule.accountId as SqlValue,
                remoteSchedule.payee as SqlValue,
                remoteSchedule.totalAmount as SqlValue,
                remoteSchedule.type as SqlValue,
                remoteSchedule.frequency as SqlValue,
                remoteSchedule.paymentMethod as SqlValue,
                remoteSchedule.startDate as SqlValue,
                remoteSchedule.endDate as SqlValue,
                remoteSchedule.nextDueDate as SqlValue,
                remoteSchedule.lastOccurredDate as SqlValue,
                remoteSchedule.memo as SqlValue,
                remoteSchedule.autoPost as SqlValue,
                remoteSchedule.isActive as SqlValue,
                remoteSchedule.isDeleted,
                remoteSchedule.clientId,
                remoteSchedule.createdAt ?? null,
                remoteSchedule.updatedAt
            ]
        );

        localDb.run('DELETE FROM recurring_splits WHERE schedule_id = ?', [remoteSchedule.id]);
        for (const split of remoteSplits) {
            localDb.run(SQL_QUERIES.INSERT_RECURRING_SPLIT, [
                split.id,
                remoteSchedule.id,
                split.categoryId as SqlValue,
                split.memo as SqlValue,
                split.amount as SqlValue,
                split.isDeleted,
                split.clientId,
                split.updatedAt
            ]);
        }
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private static mapTransaction(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            accountId: row[1] as string,
            payeeId: row[2] as string,
            date: row[3] as string,
            payee: row[4] as string,
            memo: row[5] as string,
            totalAmount: row[6] as number,
            status: row[7] as string,
            checkNumber: row[8] as string,
            importHash: row[9] as string,
            isDeleted: row[10] as number,
            clientId: row[11] as string,
            createdAt: row[12] as string,
            updatedAt: row[13] as string
        };
    }

    private static mapSplit(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            transactionId: row[1] as string,
            categoryId: row[2] as string,
            memo: row[3] as string,
            amount: row[4] as number,
            isDeleted: row[5] as number,
            clientId: row[6] as string,
            updatedAt: row[7] as string
        };
    }

    private static mapAccount(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            name: row[1] as string,
            type: row[2] as string,
            institutionName: row[3] as string,
            isActive: row[4] as number,
            deletedAt: row[5] as string,
            isDeleted: row[6] as number,
            clientId: row[7] as string,
            createdAt: row[8] as string,
            updatedAt: row[9] as string
        };
    }

    private static mapPayee(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            name: row[1] as string,
            address: row[2] as string,
            city: row[3] as string,
            state: row[4] as string,
            zipCode: row[5] as string,
            latitude: row[6] as number,
            longitude: row[7] as number,
            website: row[8] as string,
            phone: row[9] as string,
            notes: row[10] as string,
            defaultCategoryId: row[11] as string,
            isDeleted: row[12] as number,
            clientId: row[13] as string,
            createdAt: row[14] as string,
            updatedAt: row[15] as string
        };
    }

    private static mapCategory(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            parentId: row[1] as string,
            name: row[2] as string,
            description: row[3] as string,
            isActive: row[4] as number,
            isDeleted: row[5] as number,
            clientId: row[6] as string,
            createdAt: row[7] as string,
            updatedAt: row[8] as string
        };
    }

    private static mapSchedule(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            accountId: row[1] as string,
            payee: row[2] as string,
            totalAmount: row[3] as number,
            type: row[4] as string,
            frequency: row[5] as string,
            paymentMethod: row[6] as string,
            startDate: row[7] as string,
            endDate: row[8] as string,
            nextDueDate: row[9] as string,
            lastOccurredDate: row[10] as string,
            memo: row[11] as string,
            autoPost: row[12] as number,
            isActive: row[13] as number,
            isDeleted: row[14] as number,
            clientId: row[15] as string,
            createdAt: row[16] as string,
            updatedAt: row[17] as string
        };
    }

    private static mapRecurringSplit(row: Array<SqlValue>): IMergeable {
        return {
            id: row[0] as string,
            scheduleId: row[1] as string,
            categoryId: row[2] as string,
            memo: row[3] as string,
            amount: row[4] as number,
            isDeleted: row[5] as number,
            clientId: row[6] as string,
            updatedAt: row[7] as string
        };
    }

    // ── DB write helpers ──────────────────────────────────────────────────────

    private static insertItem(db: Database, table: string, item: IMergeable): void {
        const itemObj = item as unknown as Record<string, unknown>;
        const columns = Object.keys(itemObj).filter(k => typeof itemObj[k] !== 'undefined');
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(c => itemObj[c]) as Array<SqlValue>;
        db.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES(${placeholders})`, values);
    }

    private static updateItem(db: Database, table: string, item: IMergeable): void {
        const itemObj = item as unknown as Record<string, unknown>;
        const columns = Object.keys(itemObj).filter(
            k => k !== 'id' && typeof itemObj[k] !== 'undefined'
        );
        const setClause = columns.map(c => `${c} = ?`).join(', ');
        const values = columns.map(c => itemObj[c]) as Array<SqlValue>;
        values.push(item['id'] as SqlValue);
        db.run(`UPDATE ${table} SET ${setClause} WHERE id = ? `, values);
    }
}
