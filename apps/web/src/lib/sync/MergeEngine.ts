import type { Database, SqlValue } from 'sql.js';
import { SQL_QUERIES } from '@/lib/storage/SQLiteAdapter';

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

/**
 * SQLiteMergeEngine handles the logical merging of two Path Logic databases.
 * It uses Last-Writer-Wins (LWW) semantics based on the 'updatedAt' field.
 */
export class SQLiteMergeEngine {
    /**
     * Merges a remote database into the local one.
     * Returns true if any changes were made.
     */
    public static async mergeRemoteIntoLocal(
        remoteDb: Database,
        localDb: Database,
    ): Promise<boolean> {
        let hasChanges = false;

        // Perform merges in dependency order:
        // 1. Categories (referenced by payees, splits, schedules)
        // 2. Payees (referenced by transactions, schedules)
        // 3. Accounts (referenced by transactions, schedules)
        // 4. Transactions & Splits
        // 5. Recurring Schedules & Splits

        hasChanges ||= this.mergeTable(remoteDb, localDb, 'categories', this.mapCategory);
        hasChanges ||= this.mergeTable(remoteDb, localDb, 'payees', this.mapPayee);
        hasChanges ||= this.mergeTable(remoteDb, localDb, 'accounts', this.mapAccount);
        hasChanges ||= this.mergeTransactions(remoteDb, localDb);
        hasChanges ||= this.mergeRecurringSchedules(remoteDb, localDb);

        return hasChanges;
    }

    /**
     * Generic table merger for simple flat tables.
     */
    private static mergeTable<T extends IMergeable>(
        remoteDb: Database,
        localDb: Database,
        tableName: string,
        mapper: (row: Array<SqlValue>) => T,
    ): boolean {
        let hasChanges = false;

        // 1. Get all records from remote
        const remoteResult = remoteDb.exec(`SELECT * FROM ${tableName} `);
        if (remoteResult.length === 0 || !remoteResult[0]) return false;

        for (const row of remoteResult[0].values) {
            if (!row) continue;
            const remoteItem = mapper(row);

            // 2. Check for local item
            const localResult = localDb.exec(`SELECT * FROM ${tableName} WHERE id = ? `, [
                remoteItem.id,
            ]);

            if (localResult.length === 0 || !localResult[0] || localResult[0].values.length === 0) {
                // Local doesn't have it, insert
                this.insertItem(localDb, tableName, remoteItem);
                hasChanges = true;
                continue;
            }

            const localRow = localResult[0].values[0];
            if (!localRow) continue;
            const localItem = mapper(localRow);

            // 3. Compare updatedAt
            if (new Date(remoteItem.updatedAt) > new Date(localItem.updatedAt)) {
                // Remote is newer, update local
                this.updateItem(localDb, tableName, remoteItem);
                hasChanges = true;
            }
        }

        return hasChanges;
    }

    private static mergeTransactions(remoteDb: Database, localDb: Database): boolean {
        // Transactions are special because they have associated splits
        let hasChanges = false;

        const remoteResult = remoteDb.exec(`SELECT * FROM transactions`);
        if (remoteResult.length === 0 || !remoteResult[0]) return false;

        for (const row of remoteResult[0]!.values) {
            if (!row) continue;
            const remoteTx = this.mapTransaction(row);

            const localResult = localDb.exec(
                `SELECT updatedAt, isDeleted FROM transactions WHERE id = ? `,
                [remoteTx.id],
            );
            const existsLocally =
                localResult.length > 0 &&
                localResult[0] !== undefined &&
                localResult[0].values.length > 0;

            let shouldUpdate = false;
            if (!existsLocally) {
                shouldUpdate = true;
            } else {
                const localRow = localResult[0]!.values[0];
                if (localRow && localRow[0]) {
                    const localUpdatedAt = localRow[0] as string;
                    if (new Date(remoteTx.updatedAt) > new Date(localUpdatedAt)) {
                        shouldUpdate = true;
                    }
                }
            }

            if (shouldUpdate) {
                hasChanges = true;
                // Fetch remote splits
                const remoteSplitsResult = remoteDb.exec(
                    `SELECT * FROM splits WHERE transaction_id = ? `,
                    [remoteTx.id],
                );
                const remoteSplits = (remoteSplitsResult[0]?.values || [])
                    .filter((r): r is Array<SqlValue> => r !== null)
                    .map(r => this.mapSplit(r));

                // Perform transaction write
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
                        remoteTx.updatedAt,
                    ],
                );

                // Update splits
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
                        split.updatedAt,
                    ]);
                }
            }
        }

        return hasChanges;
    }

    private static mergeRecurringSchedules(remoteDb: Database, localDb: Database): boolean {
        // Similar to transactions but for schedules
        let hasChanges = false;

        const remoteResult = remoteDb.exec(`SELECT * FROM recurring_schedules`);
        if (remoteResult.length === 0 || !remoteResult[0]) return false;

        for (const row of remoteResult[0]!.values) {
            if (!row) continue;
            const remoteSchedule = this.mapSchedule(row);

            const localResult = localDb.exec(
                `SELECT updatedAt, isDeleted FROM recurring_schedules WHERE id = ? `,
                [remoteSchedule.id],
            );
            const existsLocally =
                localResult.length > 0 &&
                localResult[0] !== undefined &&
                localResult[0].values.length > 0;

            let shouldUpdate = false;
            if (!existsLocally) {
                shouldUpdate = true;
            } else {
                const localRow = localResult[0]!.values[0];
                if (localRow && localRow[0]) {
                    const localUpdatedAt = localRow[0] as string;
                    if (new Date(remoteSchedule.updatedAt) > new Date(localUpdatedAt)) {
                        shouldUpdate = true;
                    }
                }
            }

            if (shouldUpdate) {
                hasChanges = true;
                // Fetch remote splits
                const remoteSplitsResult = remoteDb.exec(
                    `SELECT * FROM recurring_splits WHERE schedule_id = ? `,
                    [remoteSchedule.id],
                );
                const remoteSplits = (remoteSplitsResult[0]?.values || [])
                    .filter((r): r is Array<SqlValue> => r !== null)
                    .map(r => this.mapRecurringSplit(r));

                // Perform schedule write
                localDb.run(
                    SQL_QUERIES.INSERT_RECURRING_SCHEDULE.replace(
                        'INSERT INTO',
                        'INSERT OR REPLACE INTO',
                    ),
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
                        remoteSchedule.updatedAt,
                    ],
                );

                // Update splits
                localDb.run('DELETE FROM recurring_splits WHERE schedule_id = ?', [
                    remoteSchedule.id,
                ]);
                for (const split of remoteSplits) {
                    localDb.run(SQL_QUERIES.INSERT_RECURRING_SPLIT, [
                        split.id,
                        remoteSchedule.id,
                        split.categoryId as SqlValue,
                        split.memo as SqlValue,
                        split.amount as SqlValue,
                        split.isDeleted,
                        split.clientId,
                        split.updatedAt,
                    ]);
                }
            }
        }

        return hasChanges;
    }

    // --- Mappers ---

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
            updatedAt: row[13] as string,
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
            updatedAt: row[7] as string,
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
            updatedAt: row[9] as string,
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
            updatedAt: row[15] as string,
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
            updatedAt: row[8] as string,
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
            updatedAt: row[17] as string,
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
            updatedAt: row[7] as string,
        };
    }

    // --- DB Write Helpers ---

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
            k => k !== 'id' && typeof itemObj[k] !== 'undefined',
        );
        const setClause = columns.map(c => `${c} = ?`).join(', ');
        const values = columns.map(c => itemObj[c]) as Array<SqlValue>;
        values.push(item['id'] as SqlValue);
        db.run(`UPDATE ${table} SET ${setClause} WHERE id = ? `, values);
    }
}
