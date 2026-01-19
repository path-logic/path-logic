import type { QueryExecResult, Database, SqlJsStatic } from 'sql.js';
import type { ISODateString, ISplit, ITransaction, TransactionStatus, IAccount, ICategory, IPayee } from '@path-logic/core';

// ============================================================================
// SQL SCHEMA (DDL)
// ============================================================================

const SCHEMA_DDL = `
    CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        institutionName TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        zipCode TEXT,
        latitude REAL,
        longitude REAL,
        website TEXT,
        phone TEXT,
        notes TEXT,
        defaultCategoryId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        parentId TEXT,
        name TEXT NOT NULL,
        description TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        payeeId TEXT NOT NULL,
        date TEXT NOT NULL,
        payee TEXT NOT NULL,
        memo TEXT NOT NULL,
        totalAmount INTEGER NOT NULL,
        status TEXT NOT NULL,
        checkNumber TEXT,
        importHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (accountId) REFERENCES accounts(id),
        FOREIGN KEY (payeeId) REFERENCES payees(id)
    );

    CREATE TABLE IF NOT EXISTS splits (
        id TEXT PRIMARY KEY,
        transactionId TEXT NOT NULL,
        categoryId TEXT,
        memo TEXT,
        amount INTEGER NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_payee ON transactions(payeeId);
    CREATE INDEX IF NOT EXISTS idx_splits_transaction ON splits(transactionId);
    CREATE INDEX IF NOT EXISTS idx_splits_category ON splits(categoryId);
`;

// ============================================================================
// SQL QUERIES
// ============================================================================

const SQL_QUERIES = {
    // Transaction queries
    INSERT_TRANSACTION: `
        INSERT INTO transactions (
            id, accountId, payeeId, date, payee, memo, totalAmount, 
            status, checkNumber, importHash, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_TRANSACTIONS: `
        SELECT * FROM transactions ORDER BY date DESC
    `,

    UPDATE_TRANSACTION: `
        UPDATE transactions 
        SET accountId = ?, payeeId = ?, date = ?, payee = ?, memo = ?, totalAmount = ?, 
            status = ?, checkNumber = ?, importHash = ?, updatedAt = ?
        WHERE id = ?
    `,

    DELETE_TRANSACTION: `
        DELETE FROM transactions WHERE id = ?
    `,

    DELETE_ALL_TRANSACTIONS: `
        DELETE FROM transactions
    `,

    // Account queries
    INSERT_ACCOUNT: `
        INSERT INTO accounts (id, name, type, institutionName, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_ACCOUNTS: `
        SELECT * FROM accounts ORDER BY name ASC
    `,

    // Payee queries
    INSERT_PAYEE: `
        INSERT INTO payees (
            id, name, address, city, state, zipCode, 
            latitude, longitude, website, phone, notes, 
            defaultCategoryId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_PAYEES: `
        SELECT * FROM payees ORDER BY name ASC
    `,

    SELECT_PAYEE_BY_NAME: `
        SELECT * FROM payees WHERE name = ?
    `,

    // Category queries
    INSERT_CATEGORY: `
        INSERT INTO categories (id, parentId, name, description, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_CATEGORIES: `
        SELECT * FROM categories ORDER BY name ASC
    `,

    // Split queries
    INSERT_SPLIT: `
        INSERT INTO splits (id, transactionId, categoryId, memo, amount)
        VALUES (?, ?, ?, ?, ?)
    `,

    SELECT_SPLITS_BY_TRANSACTION: `
        SELECT * FROM splits WHERE transactionId = ? ORDER BY id
    `,

    DELETE_SPLITS_BY_TRANSACTION: `
        DELETE FROM splits WHERE transactionId = ?
    `,

    DELETE_ALL_SPLITS: `
        DELETE FROM splits
    `,
} as const;

// ============================================================================
// COLUMN MAPPINGS (Eliminates Magic Array Indices)
// ============================================================================

/**
 * Column indices for the transactions table
 * Maps to the order in SELECT * FROM transactions
 */
const TRANSACTION_COLUMNS = {
    ID: 0,
    ACCOUNT_ID: 1,
    PAYEE_ID: 2,
    DATE: 3,
    PAYEE: 4,
    MEMO: 5,
    TOTAL_AMOUNT: 6,
    STATUS: 7,
    CHECK_NUMBER: 8,
    IMPORT_HASH: 9,
    CREATED_AT: 10,
    UPDATED_AT: 11,
} as const;

/**
 * Column indices for the splits table
 * Maps to the order in SELECT * FROM splits
 */
const SPLIT_COLUMNS = {
    ID: 0,
    TRANSACTION_ID: 1,
    CATEGORY_ID: 2,
    MEMO: 3,
    AMOUNT: 4,
} as const;

// ============================================================================
// DATABASE STATE
// ============================================================================

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

// ============================================================================
// PUBLIC API
// ============================================================================

interface ISqlJsWindow extends Window {
    initSqlJs?: (config: Record<string, unknown>) => Promise<SqlJsStatic>;
}

type SqlValue = string | number | null | Uint8Array;

/**
 * Load SQL.js via script tag to bypass bundler issues with 'fs' and Node modules
 */
async function loadSqlJsScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if ((window as ISqlJsWindow).initSqlJs) return;

    return new Promise((resolve: () => void, reject: (reason: Error) => void) => {
        const script: HTMLScriptElement = document.createElement('script');
        script.src = 'https://sql.js.org/dist/sql-wasm.js';
        script.async = true;
        script.onload = (): void => resolve();
        script.onerror = (): void => reject(new Error('Failed to load SQL.js script'));
        document.head.appendChild(script);
    });
}

import { DEFAULT_CATEGORIES } from '@path-logic/core';

/**
 * Ensures the database schema is up to date and seeded
 */
async function runMaintenance(dbInstance: Database): Promise<void> {
    // 1. Create tables if they don't exist
    dbInstance.run(SCHEMA_DDL);

    // 2. Migration: Add payeeId to transactions if missing (for legacy databases)
    const columns: Array<QueryExecResult> = dbInstance.exec("PRAGMA table_info(transactions)");
    const firstResult: QueryExecResult | undefined = columns.at(0);
    if (firstResult && firstResult.values) {
        const hasPayeeId: boolean = firstResult.values.some((v: Array<SqlValue>): boolean => v[1] === 'payeeId');
        if (!hasPayeeId) {
            // Add column allowing NULL initially for migration
            dbInstance.run("ALTER TABLE transactions ADD COLUMN payeeId TEXT");

            // Create a default 'Legacy Import' payee to link existing transactions
            const now: string = new Date().toISOString();
            const legacyPayeeId: string = 'payee-legacy-import';

            dbInstance.run(SQL_QUERIES.INSERT_PAYEE, [
                legacyPayeeId, 'Legacy Import', null, null, null, null,
                null, null, null, null, 'Automatically generated for legacy migration',
                null, now, now
            ]);

            dbInstance.run("UPDATE transactions SET payeeId = ?", [legacyPayeeId]);
        }
    }

    // 3. Seeding: Default Categories
    const catCountResult: Array<QueryExecResult> = dbInstance.exec("SELECT COUNT(*) FROM categories");
    const count: number = (catCountResult[0]?.values[0]?.[0] as number) || 0;

    if (count === 0) {
        dbInstance.run('BEGIN TRANSACTION');
        try {
            const now: string = new Date().toISOString();
            for (const cat of DEFAULT_CATEGORIES) {
                dbInstance.run(SQL_QUERIES.INSERT_CATEGORY, [
                    cat.id, cat.parentId, cat.name, cat.description, 1, now, now
                ]);
            }
            dbInstance.run('COMMIT');
        } catch (e: unknown) {
            dbInstance.run('ROLLBACK');
            throw e;
        }
    }
}

/**
 * Initialize SQL.js and create/load the database
 */
export async function initDatabase(): Promise<Database> {
    if (db) return db;

    // Initialize SQL.js WASM
    if (!SQL) {
        await loadSqlJsScript();

        const initSqlJs: ((config: Record<string, unknown>) => Promise<SqlJsStatic>) | undefined = (window as ISqlJsWindow).initSqlJs;
        if (!initSqlJs) {
            throw new Error('initSqlJs not found on window');
        }

        SQL = await initSqlJs({
            locateFile: (file: string): string => `https://sql.js.org/dist/${file}`,
        });
    }

    // Create new database in memory
    db = new SQL!.Database();

    // Run schema setup and migrations
    await runMaintenance(db);

    return db;
}

/**
 * Load database from binary data (for decryption)
 */
export async function loadDatabase(data: Uint8Array): Promise<Database> {
    if (!SQL) {
        await loadSqlJsScript();

        const initSqlJs: ((config: Record<string, unknown>) => Promise<SqlJsStatic>) | undefined = (window as ISqlJsWindow).initSqlJs;
        if (!initSqlJs) {
            throw new Error('initSqlJs not found on window');
        }

        SQL = await initSqlJs({
            locateFile: (file: string): string => `https://sql.js.org/dist/${file}`,
        });
    }

    db = new SQL!.Database(data);
    await runMaintenance(db);
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
    db.run(SQL_QUERIES.INSERT_TRANSACTION, [
        tx.id,
        tx.accountId,
        tx.payeeId,
        tx.date,
        tx.payee,
        tx.memo,
        tx.totalAmount,
        tx.status,
        tx.checkNumber || null,
        tx.importHash,
        tx.createdAt,
        tx.updatedAt,
    ]);

    // Insert splits
    for (const split of tx.splits) {
        db.run(SQL_QUERIES.INSERT_SPLIT, [
            split.id,
            tx.id,
            split.categoryId || null,
            split.memo,
            split.amount,
        ]);
    }
}

/**
 * Bulk insert transactions with their splits
 */
export function insertTransactions(txs: Array<ITransaction>): void {
    if (!db) throw new Error('Database not initialized');

    db.run('BEGIN TRANSACTION');
    try {
        for (const tx of txs) {
            // Insert transaction
            db.run(SQL_QUERIES.INSERT_TRANSACTION, [
                tx.id,
                tx.accountId,
                tx.payeeId,
                tx.date,
                tx.payee,
                tx.memo,
                tx.totalAmount,
                tx.status,
                tx.checkNumber || null,
                tx.importHash,
                tx.createdAt,
                tx.updatedAt,
            ]);

            // Insert splits
            for (const split of tx.splits) {
                db.run(SQL_QUERIES.INSERT_SPLIT, [
                    split.id,
                    tx.id,
                    split.categoryId || null,
                    split.memo,
                    split.amount,
                ]);
            }
        }
        db.run('COMMIT');
    } catch (error: unknown) {
        db.run('ROLLBACK');
        throw error;
    }
}

/**
 * Get all transactions with their splits
 */
export function getAllTransactions(): Array<ITransaction> {
    if (!db) throw new Error('Database not initialized');

    const txRows: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_TRANSACTIONS);
    if (txRows.length === 0) return new Array<ITransaction>();

    const transactions: Array<ITransaction> = new Array<ITransaction>();
    const txData: QueryExecResult | undefined = txRows.at(0);

    if (!txData) return new Array<ITransaction>();

    for (const row of txData.values) {
        const txId: string = row[TRANSACTION_COLUMNS.ID]?.toString() || '';
        if (!txId) continue;

        // Get splits for this transaction
        const splitRows: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_SPLITS_BY_TRANSACTION, [txId]);

        const splits: Array<ISplit> = new Array<ISplit>();
        if (splitRows.length > 0 && splitRows[0]) {
            for (const splitRow of splitRows[0].values) {
                splits.push({
                    id: splitRow[SPLIT_COLUMNS.ID] as string,
                    amount: splitRow[SPLIT_COLUMNS.AMOUNT] as number,
                    memo: (splitRow[SPLIT_COLUMNS.MEMO] as string) || '',
                    categoryId: (splitRow[SPLIT_COLUMNS.CATEGORY_ID] as string) || null,
                } satisfies ISplit);
            }
        }

        transactions.push({
            id: txId,
            accountId: row[TRANSACTION_COLUMNS.ACCOUNT_ID] as string,
            payeeId: row[TRANSACTION_COLUMNS.PAYEE_ID] as string,
            date: row[TRANSACTION_COLUMNS.DATE] as ISODateString,
            payee: row[TRANSACTION_COLUMNS.PAYEE] as string,
            memo: row[TRANSACTION_COLUMNS.MEMO] as string,
            totalAmount: row[TRANSACTION_COLUMNS.TOTAL_AMOUNT] as number,
            status: row[TRANSACTION_COLUMNS.STATUS] as TransactionStatus,
            checkNumber: (row[TRANSACTION_COLUMNS.CHECK_NUMBER] as string) || '',
            importHash: row[TRANSACTION_COLUMNS.IMPORT_HASH] as string,
            createdAt: row[TRANSACTION_COLUMNS.CREATED_AT] as ISODateString,
            updatedAt: row[TRANSACTION_COLUMNS.UPDATED_AT] as ISODateString,
            splits,
        } satisfies ITransaction);
    }

    return transactions;
}

/**
 * Update a transaction
 */
export function updateTransaction(tx: ITransaction): void {
    if (!db) throw new Error('Database not initialized');

    db.run(SQL_QUERIES.UPDATE_TRANSACTION, [
        tx.accountId,
        tx.payeeId,
        tx.date,
        tx.payee,
        tx.memo,
        tx.totalAmount,
        tx.status,
        tx.checkNumber || null,
        tx.importHash,
        tx.updatedAt,
        tx.id,
    ]);

    // Delete existing splits and re-insert
    db.run(SQL_QUERIES.DELETE_SPLITS_BY_TRANSACTION, [tx.id]);
    for (const split of tx.splits) {
        db.run(SQL_QUERIES.INSERT_SPLIT, [
            split.id,
            tx.id,
            split.categoryId || null,
            split.memo,
            split.amount,
        ]);
    }
}

/**
 * Delete a transaction and its splits
 */
export function deleteTransaction(txId: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run(SQL_QUERIES.DELETE_TRANSACTION, [txId]);
    // Splits are deleted automatically via CASCADE
}

/**
 * Get all accounts
 */
export function getAllAccounts(): Array<IAccount> {
    if (!db) throw new Error('Database not initialized');

    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_ACCOUNTS);
    if (result.length === 0 || !result[0]) return new Array<IAccount>();

    return result[0].values.map((row: Array<SqlValue>): IAccount => ({
        id: row[0] as string,
        name: row[1] as string,
        type: row[2] as IAccount['type'],
        institutionName: row[3] as string,
        isActive: Boolean(row[4]),
        createdAt: row[5] as ISODateString,
        updatedAt: row[6] as ISODateString,
        clearedBalance: 0, // Calculated dynamically in store
        pendingBalance: 0,  // Calculated dynamically in store
    }));
}

/**
 * Insert or update an account
 */
export function insertAccount(account: IAccount): void {
    if (!db) throw new Error('Database not initialized');
    db.run(SQL_QUERIES.INSERT_ACCOUNT, [
        account.id,
        account.name,
        account.type,
        account.institutionName,
        account.isActive ? 1 : 0,
        account.createdAt,
        account.updatedAt
    ]);
}

/**
 * Get all payees
 */
export function getAllPayees(): Array<IPayee> {
    if (!db) throw new Error('Database not initialized');

    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_PAYEES);
    if (result.length === 0 || !result[0]) return new Array<IPayee>();

    return result[0].values.map((row: Array<SqlValue>): IPayee => ({
        id: row[0] as string,
        name: row[1] as string,
        address: row[2] as string | null,
        city: row[3] as string | null,
        state: row[4] as string | null,
        zipCode: row[5] as string | null,
        latitude: row[6] as number | null,
        longitude: row[7] as number | null,
        website: row[8] as string | null,
        phone: row[9] as string | null,
        notes: row[10] as string | null,
        defaultCategoryId: row[11] as string | null,
        createdAt: row[12] as ISODateString,
        updatedAt: row[13] as ISODateString,
    }));
}

/**
 * Get a payee by name (case sensitive)
 */
export function getPayeeByName(name: string): IPayee | null {
    if (!db) throw new Error('Database not initialized');
    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_PAYEE_BY_NAME, [name]);
    if (result.length === 0 || !result[0] || result[0].values.length === 0) return null;

    const row: Array<SqlValue> | undefined = result[0].values.at(0);
    if (!row) return null;

    return {
        id: row[0] as string,
        name: row[1] as string,
        address: row[2] as string | null,
        city: row[3] as string | null,
        state: row[4] as string | null,
        zipCode: row[5] as string | null,
        latitude: row[6] as number | null,
        longitude: row[7] as number | null,
        website: row[8] as string | null,
        phone: row[9] as string | null,
        notes: row[10] as string | null,
        defaultCategoryId: row[11] as string | null,
        createdAt: row[12] as ISODateString,
        updatedAt: row[13] as ISODateString,
    };
}

/**
 * Insert a payee record
 */
export function insertPayee(payee: IPayee): void {
    if (!db) throw new Error('Database not initialized');
    db.run(SQL_QUERIES.INSERT_PAYEE, [
        payee.id,
        payee.name,
        payee.address,
        payee.city,
        payee.state,
        payee.zipCode,
        payee.latitude,
        payee.longitude,
        payee.website,
        payee.phone,
        payee.notes,
        payee.defaultCategoryId,
        payee.createdAt,
        payee.updatedAt
    ]);
}

/**
 * Get all categories
 */
export function getAllCategories(): Array<ICategory> {
    if (!db) throw new Error('Database not initialized');

    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_CATEGORIES);
    if (result.length === 0 || !result[0]) return new Array<ICategory>();

    return result[0].values.map((row: Array<SqlValue>): ICategory => ({
        id: row[0] as string,
        parentId: row[1] as string | null,
        name: row[2] as string,
        description: row[3] as string | null,
        isActive: Boolean(row[4]),
        createdAt: row[5] as ISODateString,
        updatedAt: row[6] as ISODateString,
    }));
}

/**
 * Clear all data (for testing)
 */
export function clearDatabase(): void {
    if (!db) throw new Error('Database not initialized');
    db.run(SQL_QUERIES.DELETE_ALL_SPLITS);
    db.run(SQL_QUERIES.DELETE_ALL_TRANSACTIONS);
    db.run("DELETE FROM categories");
    db.run("DELETE FROM payees");
    db.run("DELETE FROM accounts");
}
