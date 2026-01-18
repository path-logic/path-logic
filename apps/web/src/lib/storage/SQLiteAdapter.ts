import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import type { ITransaction, ISplit, ISODateString, TransactionStatus } from '@path-logic/core';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

/**
 * Initialize SQL.js and create/load the database
 */
export async function initDatabase(): Promise<Database> {
    if (db) return db;

    // Initialize SQL.js WASM
    if (!SQL) {
        SQL = await initSqlJs({
            locateFile: (file: string): string => `https://sql.js.org/dist/${file}`,
        });
    }

    // Create new database in memory
    db = new SQL.Database();

    // Create schema
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            accountId TEXT NOT NULL,
            date TEXT NOT NULL,
            payee TEXT NOT NULL,
            memo TEXT NOT NULL,
            totalAmount INTEGER NOT NULL,
            status TEXT NOT NULL,
            checkNumber TEXT,
            importHash TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS splits (
            id TEXT PRIMARY KEY,
            transactionId TEXT NOT NULL,
            categoryId TEXT,
            memo TEXT,
            amount INTEGER NOT NULL,
            FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(accountId);
        CREATE INDEX IF NOT EXISTS idx_splits_transaction ON splits(transactionId);
    `);

    return db;
}

/**
 * Load database from binary data (for decryption)
 */
export async function loadDatabase(data: Uint8Array): Promise<Database> {
    if (!SQL) {
        SQL = await initSqlJs({
            locateFile: (file: string): string => `https://sql.js.org/dist/${file}`,
        });
    }

    db = new SQL.Database(data);
    return db;
}

/**
 * Export database to binary format (for encryption)
 */
export function exportDatabase(): Uint8Array {
    if (!db) throw new Error('Database not initialized');
    return db.export();
}

/**
 * Insert a transaction with its splits
 */
export function insertTransaction(tx: ITransaction): void {
    if (!db) throw new Error('Database not initialized');

    // Insert transaction
    db.run(
        `INSERT INTO transactions (id, accountId, date, payee, memo, totalAmount, status, checkNumber, importHash, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tx.id,
            tx.accountId,
            tx.date,
            tx.payee,
            tx.memo,
            tx.totalAmount,
            tx.status,
            tx.checkNumber || null,
            tx.importHash,
            tx.createdAt,
            tx.updatedAt,
        ]
    );

    // Insert splits
    for (const split of tx.splits) {
        db.run(
            `INSERT INTO splits (id, transactionId, categoryId, memo, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [split.id, tx.id, split.categoryId || null, split.memo, split.amount]
        );
    }
}

/**
 * Get all transactions with their splits
 */
export function getAllTransactions(): Array<ITransaction> {
    if (!db) throw new Error('Database not initialized');

    const txRows = db.exec('SELECT * FROM transactions ORDER BY date DESC');
    if (txRows.length === 0) return [];

    const transactions: Array<ITransaction> = [];
    const txData = txRows[0];

    if (!txData) return [];

    for (const row of txData.values) {
        const txId = row[0] as string;

        // Get splits for this transaction
        const splitRows = db.exec(
            'SELECT * FROM splits WHERE transactionId = ? ORDER BY id',
            [txId]
        );

        const splits: Array<ISplit> = [];
        if (splitRows.length > 0 && splitRows[0]) {
            for (const splitRow of splitRows[0].values) {
                splits.push({
                    id: splitRow[0] as string,
                    amount: splitRow[4] as number,
                    memo: (splitRow[3] as string) || '',
                    categoryId: (splitRow[2] as string) || null,
                });
            }
        }

        transactions.push({
            id: txId,
            accountId: row[1] as string,
            date: row[2] as ISODateString,
            payee: row[3] as string,
            memo: row[4] as string,
            totalAmount: row[5] as number,
            status: row[6] as TransactionStatus,
            checkNumber: (row[7] as string) || '',
            importHash: row[8] as string,
            createdAt: row[9] as ISODateString,
            updatedAt: row[10] as ISODateString,
            splits,
        });
    }

    return transactions;
}

/**
 * Update a transaction
 */
export function updateTransaction(tx: ITransaction): void {
    if (!db) throw new Error('Database not initialized');

    db.run(
        `UPDATE transactions 
         SET accountId = ?, date = ?, payee = ?, memo = ?, totalAmount = ?, 
             status = ?, checkNumber = ?, importHash = ?, updatedAt = ?
         WHERE id = ?`,
        [
            tx.accountId,
            tx.date,
            tx.payee,
            tx.memo,
            tx.totalAmount,
            tx.status,
            tx.checkNumber || null,
            tx.importHash,
            tx.updatedAt,
            tx.id,
        ]
    );

    // Delete existing splits and re-insert
    db.run('DELETE FROM splits WHERE transactionId = ?', [tx.id]);
    for (const split of tx.splits) {
        db.run(
            `INSERT INTO splits (id, transactionId, categoryId, memo, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [split.id, tx.id, split.categoryId || null, split.memo, split.amount]
        );
    }
}

/**
 * Delete a transaction and its splits
 */
export function deleteTransaction(txId: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM transactions WHERE id = ?', [txId]);
    // Splits are deleted automatically via CASCADE
}

/**
 * Clear all data (for testing)
 */
export function clearDatabase(): void {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM splits');
    db.run('DELETE FROM transactions');
}
