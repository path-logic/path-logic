import type { QueryExecResult, Database, SqlJsStatic } from 'sql.js';
import type {
    ISODateString,
    ISplit,
    ITransaction,
    TransactionStatus,
    IAccount,
    ICategory,
    IPayee,
    ILoanDetails,
    Cents,
    IRecurringSchedule,
} from '@path-logic/core';
import { TypeGuards } from '@path-logic/core';

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
        deletedAt TEXT,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loan_details (
        account_id TEXT PRIMARY KEY,
        original_amount INTEGER NOT NULL,
        interest_rate REAL NOT NULL,
        term_months INTEGER NOT NULL,
        monthly_payment INTEGER NOT NULL,
        payment_due_day INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        metadata TEXT,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
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
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        parentId TEXT,
        name TEXT NOT NULL,
        description TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
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
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
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
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_payee ON transactions(payeeId);
    CREATE INDEX IF NOT EXISTS idx_splits_transaction ON splits(transactionId);
    CREATE INDEX IF NOT EXISTS idx_splits_category ON splits(categoryId);
    CREATE INDEX IF NOT EXISTS idx_loan_details_account ON loan_details(account_id);

    CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_schedules (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        payee TEXT NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        frequency TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT,
        nextDueDate TEXT NOT NULL,
        lastOccurredDate TEXT,
        memo TEXT NOT NULL,
        autoPost INTEGER NOT NULL DEFAULT 0,
        isActive INTEGER NOT NULL DEFAULT 1,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (accountId) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS recurring_splits (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        categoryId TEXT,
        memo TEXT,
        amount INTEGER NOT NULL,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        clientId TEXT,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (scheduleId) REFERENCES recurring_schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
    );
`;

// ============================================================================
// SQL QUERIES
// ============================================================================

export const SQL_QUERIES = {
    // Transaction queries
    INSERT_TRANSACTION: `
        INSERT INTO transactions (
            id, accountId, payeeId, date, payee, memo, totalAmount, 
            status, checkNumber, importHash, isDeleted, clientId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_TRANSACTIONS: `
        SELECT * FROM transactions WHERE isDeleted = 0 ORDER BY date DESC
    `,

    UPDATE_TRANSACTION: `
        UPDATE transactions 
        SET accountId = ?, payeeId = ?, date = ?, payee = ?, memo = ?, totalAmount = ?, 
            status = ?, checkNumber = ?, importHash = ?, isDeleted = ?, clientId = ?, updatedAt = ?
        WHERE id = ?
    `,

    DELETE_TRANSACTION: `
        UPDATE transactions SET isDeleted = 1, updatedAt = ? WHERE id = ?
    `,

    DELETE_ALL_TRANSACTIONS: `
        UPDATE transactions SET isDeleted = 1, updatedAt = ?
    `,

    // Account queries
    INSERT_ACCOUNT: `
        INSERT INTO accounts (id, name, type, institutionName, isActive, deletedAt, isDeleted, clientId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SOFT_DELETE_ACCOUNT: `
        UPDATE accounts SET isActive = 0, deletedAt = ?, isDeleted = 1, updatedAt = ? WHERE id = ?
    `,

    UPDATE_ACCOUNT: `
        UPDATE accounts SET name = ?, type = ?, institutionName = ?, isActive = ?, deletedAt = ?, isDeleted = ?, clientId = ?, updatedAt = ? WHERE id = ?
    `,

    SELECT_ALL_ACCOUNTS: `
        SELECT * FROM accounts WHERE isDeleted = 0 ORDER BY name ASC
    `,

    // Payee queries
    INSERT_PAYEE: `
        INSERT INTO payees (
            id, name, address, city, state, zipCode, 
            latitude, longitude, website, phone, notes, 
            defaultCategoryId, isDeleted, clientId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_PAYEES: `
        SELECT * FROM payees WHERE isDeleted = 0 ORDER BY name ASC
    `,

    SELECT_PAYEE_BY_NAME: `
        SELECT * FROM payees WHERE name = ? AND isDeleted = 0
    `,

    // Category queries
    INSERT_CATEGORY: `
        INSERT INTO categories (id, parentId, name, description, isActive, isDeleted, clientId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_CATEGORIES: `
        SELECT * FROM categories WHERE isDeleted = 0 ORDER BY name ASC
    `,

    DELETE_PAYEE: `
        UPDATE payees SET isDeleted = 1, updatedAt = ? WHERE id = ?
    `,

    DELETE_CATEGORY: `
        UPDATE categories SET isDeleted = 1, updatedAt = ? WHERE id = ?
    `,

    // Split queries
    INSERT_SPLIT: `
        INSERT INTO splits (id, transactionId, categoryId, memo, amount, isDeleted, clientId, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_SPLITS_BY_TRANSACTION: `
SELECT * FROM splits WHERE transactionId = ? AND isDeleted = 0 ORDER BY id
    `,

    DELETE_SPLITS_BY_TRANSACTION: `
        UPDATE splits SET isDeleted = 1, updatedAt = ? WHERE transactionId = ?
    `,

    DELETE_ALL_SPLITS: `
        UPDATE splits SET isDeleted = 1, updatedAt = ?
    `,

    // Loan Details queries
    INSERT_LOAN_DETAILS: `
        INSERT INTO loan_details(
        account_id, original_amount, interest_rate, term_months,
        monthly_payment, payment_due_day, start_date, metadata,
        isDeleted, clientId, created_at, updated_at
    )
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_LOAN_DETAILS: `
SELECT * FROM loan_details WHERE account_id = ? AND isDeleted = 0
    `,

    // User Settings queries
    INSERT_USER_SETTING: `
        INSERT OR REPLACE INTO user_settings(key, value, updatedAt)
VALUES(?, ?, ?)
    `,

    SELECT_USER_SETTING: `
        SELECT value FROM user_settings WHERE key = ?
    `,

    // Sync Metadata queries
    INSERT_SYNC_METADATA: `
        INSERT OR REPLACE INTO sync_metadata(key, value, updatedAt)
VALUES(?, ?, ?)
    `,

    SELECT_SYNC_METADATA: `
        SELECT value FROM sync_metadata WHERE key = ?
    `,

    // Recurring Schedule queries
    INSERT_RECURRING_SCHEDULE: `
        INSERT INTO recurring_schedules(
        id, accountId, payee, amount, type, frequency, paymentMethod,
        startDate, endDate, nextDueDate, lastOccurredDate,
        memo, autoPost, isActive, isDeleted, clientId, createdAt, updatedAt
    )
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_ALL_RECURRING_SCHEDULES: `
SELECT * FROM recurring_schedules WHERE isDeleted = 0 ORDER BY nextDueDate ASC
    `,

    UPDATE_RECURRING_SCHEDULE: `
        UPDATE recurring_schedules 
        SET accountId = ?, payee = ?, amount = ?, type = ?, frequency = ?,
    paymentMethod = ?, startDate = ?, endDate = ?,
    nextDueDate = ?, lastOccurredDate = ?,
    memo = ?, autoPost = ?, isActive = ?, isDeleted = ?, clientId = ?, updatedAt = ?
        WHERE id = ?
            `,

    DELETE_RECURRING_SCHEDULE: `
        UPDATE recurring_schedules SET isDeleted = 1, updatedAt = ? WHERE id = ?
    `,

    INSERT_RECURRING_SPLIT: `
        INSERT INTO recurring_splits(id, scheduleId, categoryId, memo, amount, isDeleted, clientId, updatedAt)
VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `,

    SELECT_RECURRING_SPLITS_BY_SCHEDULE: `
SELECT * FROM recurring_splits WHERE scheduleId = ? AND isDeleted = 0 ORDER BY id
    `,

    DELETE_RECURRING_SPLITS_BY_SCHEDULE: `
        UPDATE recurring_splits SET isDeleted = 1, updatedAt = ? WHERE scheduleId = ?
    `,
} as const;

// ============================================================================
// COLUMN MAPPINGS (Eliminates Magic Array Indices)
// ============================================================================

/**
 * Column indices for the transactions table
 * Maps to the order in SELECT * FROM transactions
 */
export const TRANSACTION_COLUMNS = {
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
    IS_DELETED: 10,
    CLIENT_ID: 11,
    CREATED_AT: 12,
    UPDATED_AT: 13,
} as const;

/**
 * Column indices for the splits table
 * Maps to the order in SELECT * FROM splits
 */
export const SPLIT_COLUMNS = {
    ID: 0,
    TRANSACTION_ID: 1,
    CATEGORY_ID: 2,
    MEMO: 3,
    AMOUNT: 4,
    IS_DELETED: 5,
    CLIENT_ID: 6,
    UPDATED_AT: 7,
} as const;

// ============================================================================
// DEVICE IDENTITY
// ============================================================================

/**
 * Get or create a unique ID for this browser instance
 */
export function getClientId(): string {
    if (typeof window === 'undefined') return 'server';

    let id: string | null = localStorage.getItem('path_logic_client_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('path_logic_client_id', id);
    }
    return id;
}

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
    const columns: Array<QueryExecResult> = dbInstance.exec('PRAGMA table_info(transactions)');
    const firstResult: QueryExecResult | undefined = columns.at(0);
    if (firstResult && firstResult.values) {
        const hasPayeeId: boolean = firstResult.values.some(
            (v: Array<SqlValue>): boolean => v[1] === 'payeeId',
        );
        if (!hasPayeeId) {
            // Add column allowing NULL initially for migration
            dbInstance.run('ALTER TABLE transactions ADD COLUMN payeeId TEXT');

            // Create a default 'Legacy Import' payee to link existing transactions
            const now: string = new Date().toISOString();
            const legacyPayeeId: string = 'payee-legacy-import';

            dbInstance.run(SQL_QUERIES.INSERT_PAYEE, [
                legacyPayeeId,
                'Legacy Import',
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                'Automatically generated for legacy migration',
                null,
                0, // isDeleted
                getClientId(),
                now,
                now,
            ]);

            dbInstance.run('UPDATE transactions SET payeeId = ?', [legacyPayeeId]);
        }
    }

    // Migration: Add isDeleted and clientId to all tables if missing
    const tables: Array<string> = [
        'accounts',
        'payees',
        'categories',
        'transactions',
        'splits',
        'recurring_schedules',
        'recurring_splits',
        'loan_details',
    ];
    for (const table of tables) {
        const tableInfo: Array<QueryExecResult> = dbInstance.exec(`PRAGMA table_info(${table})`);
        if (tableInfo[0]?.values) {
            const cols: Array<Array<SqlValue>> = tableInfo[0].values as Array<Array<SqlValue>>;
            const hasIsDeleted: boolean = cols.some((v): boolean => v[1] === 'isDeleted');
            const hasClientId: boolean = cols.some((v): boolean => v[1] === 'clientId');
            const hasUpdatedAt: boolean = cols.some((v): boolean => v[1] === 'updatedAt');

            if (!hasIsDeleted) {
                dbInstance.run(
                    `ALTER TABLE ${table} ADD COLUMN isDeleted INTEGER NOT NULL DEFAULT 0`,
                );
            }
            if (!hasClientId) {
                dbInstance.run(`ALTER TABLE ${table} ADD COLUMN clientId TEXT`);
            }
            if (!hasUpdatedAt && table !== 'loan_details') {
                // loan_details has updated_at (snake_case)
                dbInstance.run(`ALTER TABLE ${table} ADD COLUMN updatedAt TEXT`);
            }
        }
    }

    // Migration: Add deletedAt to accounts if missing
    const accountColumns: Array<QueryExecResult> = dbInstance.exec('PRAGMA table_info(accounts)');
    const accountsResult: QueryExecResult | undefined = accountColumns.at(0);
    if (accountsResult && accountsResult.values) {
        const hasDeletedAt: boolean = accountsResult.values.some(
            (v: Array<SqlValue>): boolean => v[1] === 'deletedAt',
        );
        if (!hasDeletedAt) {
            dbInstance.run('ALTER TABLE accounts ADD COLUMN deletedAt TEXT');
        }
    }

    // 3. Seeding: Default Categories
    const catCountResult: Array<QueryExecResult> = dbInstance.exec(
        'SELECT COUNT(*) FROM categories',
    );
    const count: number = (catCountResult[0]?.values[0]?.[0] as number) || 0;

    if (count === 0) {
        dbInstance.run('BEGIN TRANSACTION');
        try {
            const now: string = new Date().toISOString();
            for (const cat of DEFAULT_CATEGORIES) {
                dbInstance.run(SQL_QUERIES.INSERT_CATEGORY, [
                    cat.id,
                    cat.parentId,
                    cat.name,
                    cat.description,
                    1, // isActive
                    0, // isDeleted
                    getClientId(),
                    now,
                    now,
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
 * Internal helper to ensure SQL.js is initialized
 */
async function ensureSqlJs(): Promise<SqlJsStatic> {
    if (SQL) return SQL;

    await loadSqlJsScript();
    const initSqlJs: ((config: Record<string, unknown>) => Promise<SqlJsStatic>) | undefined = (
        window as ISqlJsWindow
    ).initSqlJs;
    if (!initSqlJs) {
        throw new Error('initSqlJs not found on window');
    }

    SQL = await initSqlJs({
        locateFile: (file: string): string => `https://sql.js.org/dist/${file}`,
    });
    return SQL;
}

/**
 * Initialize SQL.js and create/load the database
 */
export async function initDatabase(): Promise<Database> {
    if (db) return db;

    const sqlInstance = await ensureSqlJs();
    // Create new database in memory
    db = new sqlInstance.Database();

    // Run schema setup and migrations
    await runMaintenance(db);

    return db;
}

/**
 * Load database from binary data (for decryption)
 */
export async function loadDatabase(data: Uint8Array): Promise<Database> {
    const sqlInstance = await ensureSqlJs();
    db = new sqlInstance.Database(data);
    await runMaintenance(db);
    return db;
}

/**
 * Creates a NEW, isolated database instance (used for merging)
 * This does NOT modify the global active 'db' instance.
 */
export async function createIsolatedDatabase(data?: Uint8Array): Promise<Database> {
    const sqlInstance = await ensureSqlJs();
    const isolatedDb = new sqlInstance.Database(data);
    // Note: We don't run runMaintenance here because it's usually used for
    // merging existing data that already matches the schema or will be
    // handled by the merge engine.
    return isolatedDb;
}

/**
 * Export database to binary format (for encryption)
 */
export function exportDatabase(): Uint8Array {
    if (!db) throw new Error('Database not initialized');
    return db.export();
}

/**
 * Get internal database instance
 */
export function getDb(): Database | null {
    return db;
}

/**
 * Resets the in-memory database state
 */
export function resetDatabase(): void {
    db = null;
}

export function insertTransaction(tx: ITransaction): void {
    if (!db) throw new Error('Database not initialized');

    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

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
        0, // isDeleted
        clientId,
        tx.createdAt || now,
        tx.updatedAt || now,
    ]);

    // Insert splits
    for (const split of tx.splits) {
        db.run(SQL_QUERIES.INSERT_SPLIT, [
            split.id,
            tx.id,
            split.categoryId || null,
            split.memo,
            split.amount,
            0, // isDeleted
            clientId,
            tx.updatedAt || now,
        ]);
    }
}

/**
 * Bulk insert transactions with their splits
 */
export function insertTransactions(txs: Array<ITransaction>): void {
    if (!db) throw new Error('Database not initialized');

    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

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
                0, // isDeleted
                clientId,
                tx.createdAt || now,
                tx.updatedAt || now,
            ]);

            // Insert splits
            for (const split of tx.splits) {
                db.run(SQL_QUERIES.INSERT_SPLIT, [
                    split.id,
                    tx.id,
                    split.categoryId || null,
                    split.memo,
                    split.amount,
                    0, // isDeleted
                    clientId,
                    tx.updatedAt || now,
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
        const splitRows: Array<QueryExecResult> = db.exec(
            SQL_QUERIES.SELECT_SPLITS_BY_TRANSACTION,
            [txId],
        );

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

    const now: string = new Date().toISOString();
    const clientId: string = getClientId();
    const updatedAt: string = tx.updatedAt || now;

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
        0, // isDeleted
        clientId,
        updatedAt,
        tx.id,
    ]);

    // Mark existing splits as deleted and re-insert
    db.run(SQL_QUERIES.DELETE_SPLITS_BY_TRANSACTION, [updatedAt, tx.id]);
    for (const split of tx.splits) {
        db.run(SQL_QUERIES.INSERT_SPLIT, [
            split.id,
            tx.id,
            split.categoryId || null,
            split.memo,
            split.amount,
            0, // isDeleted
            clientId,
            updatedAt,
        ]);
    }
}

/**
 * Delete a transaction and its splits
 */
export function deleteTransaction(txId: string): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    db.run(SQL_QUERIES.DELETE_TRANSACTION, [now, txId]);
    db.run(SQL_QUERIES.DELETE_SPLITS_BY_TRANSACTION, [now, txId]);
}

/**
 * Get all accounts
 */
export function getAllAccounts(includeDeleted = false): Array<IAccount> {
    if (!db) throw new Error('Database not initialized');

    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_ACCOUNTS);
    if (result.length === 0 || !result[0]) return new Array<IAccount>();

    return result[0].values
        .map((row: Array<SqlValue>): IAccount => {
            const account: IAccount = {
                id: row[0] as string,
                name: row[1] as string,
                type: row[2] as IAccount['type'],
                institutionName: row[3] as string,
                isActive: Boolean(row[4]),
                deletedAt: (row[5] as string) || null,
                createdAt: row[8] as ISODateString,
                updatedAt: row[9] as ISODateString,
                clearedBalance: 0, // Calculated dynamically in store
                pendingBalance: 0, // Calculated dynamically in store
            };

            // Load loan details if applicable
            if (TypeGuards.isLoanAccount(account.type)) {
                const details = getLoanDetails(account.id);
                if (details) {
                    account.loanDetails = details;
                }
            }

            return account;
        })
        .filter(acc => includeDeleted || !acc.deletedAt);
}

/**
 * Insert or update an account
 */
export function insertAccount(account: IAccount): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

    db.run(SQL_QUERIES.INSERT_ACCOUNT, [
        account.id,
        account.name,
        account.type,
        account.institutionName,
        account.isActive ? 1 : 0,
        account.deletedAt || null,
        0, // isDeleted
        clientId,
        account.createdAt || now,
        account.updatedAt || now,
    ]);

    // Insert loan details if present
    if (account.loanDetails) {
        insertLoanDetails(account.id, account.loanDetails);
    }
}

/**
 * Update an account's details
 */
export function updateAccount(account: IAccount): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();
    const updatedAt: string = account.updatedAt || now;

    db.run(SQL_QUERIES.UPDATE_ACCOUNT, [
        account.name,
        account.type,
        account.institutionName,
        account.isActive ? 1 : 0,
        account.deletedAt || null,
        0, // isDeleted
        clientId,
        updatedAt,
        account.id,
    ]);

    // Update loan details if present
    if (account.loanDetails) {
        // For simplicity, we delete and re-insert loan details for updates
        db?.run('DELETE FROM loan_details WHERE account_id = ?', [account.id]);
        insertLoanDetails(account.id, account.loanDetails);
    }
}

/**
 * Soft delete an account by setting deletedAt and isActive = 0
 */
export function softDeleteAccount(id: string): void {
    if (!db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    db.run(SQL_QUERIES.SOFT_DELETE_ACCOUNT, [now, now, id]);
}

/**
 * Insert loan details for an account
 */
export function insertLoanDetails(accountId: string, details: ILoanDetails): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

    db.run(SQL_QUERIES.INSERT_LOAN_DETAILS, [
        accountId,
        details.originalAmount,
        details.interestRate,
        details.termMonths,
        details.monthlyPayment,
        details.paymentDueDay,
        details.startDate,
        details.metadata ? JSON.stringify(details.metadata) : null,
        0, // isDeleted
        clientId,
        now,
        now,
    ]);
}

/**
 * Get loan details for an account
 */
export function getLoanDetails(accountId: string): ILoanDetails | undefined {
    if (!db) throw new Error('Database not initialized');
    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_LOAN_DETAILS, [accountId]);

    if (result.length === 0 || !result[0] || result[0].values.length === 0) return undefined;

    const row: Array<SqlValue> | undefined = result[0].values.at(0);
    if (!row) return undefined;

    // Schema:
    // 0: account_id
    // 1: original_amount
    // 2: interest_rate
    // 3: term_months
    // 4: monthly_payment
    // 5: payment_due_day
    // 6: start_date
    // 7: metadata

    const metadataJson = row[7] as string | null;

    return {
        originalAmount: row[1] as Cents,
        interestRate: row[2] as number,
        termMonths: row[3] as number,
        monthlyPayment: row[4] as Cents,
        paymentDueDay: row[5] as number,
        startDate: row[6] as ISODateString,
        metadata: metadataJson ? JSON.parse(metadataJson) : undefined,
    };
}

/**
 * Get all payees
 */
export function getAllPayees(): Array<IPayee> {
    if (!db) throw new Error('Database not initialized');

    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_PAYEES);
    if (result.length === 0 || !result[0]) return new Array<IPayee>();

    return result[0].values.map(
        (row: Array<SqlValue>): IPayee => ({
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
            createdAt: row[14] as ISODateString,
            updatedAt: row[15] as ISODateString,
        }),
    );
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
        createdAt: row[14] as ISODateString,
        updatedAt: row[15] as ISODateString,
    };
}

/**
 * Insert a payee record
 */
export function insertPayee(payee: IPayee): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

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
        0, // isDeleted
        clientId,
        payee.createdAt || now,
        payee.updatedAt || now,
    ]);
}

/**
 * Insert a category record
 */
export function insertCategory(category: ICategory): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

    db.run(SQL_QUERIES.INSERT_CATEGORY, [
        category.id,
        category.parentId || null,
        category.name,
        category.description || null,
        category.isActive ? 1 : 0,
        0, // isDeleted
        clientId,
        category.createdAt || now,
        category.updatedAt || now,
    ]);
}

/**
 * Get all categories
 */
export function getAllCategories(): Array<ICategory> {
    if (!db) throw new Error('Database not initialized');

    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_ALL_CATEGORIES);
    if (result.length === 0 || !result[0]) return new Array<ICategory>();

    return result[0].values.map(
        (row: Array<SqlValue>): ICategory => ({
            id: row[0] as string,
            parentId: row[1] as string | null,
            name: row[2] as string,
            description: row[3] as string | null,
            isActive: Boolean(row[4]),
            createdAt: row[7] as ISODateString,
            updatedAt: row[8] as ISODateString,
        }),
    );
}

/**
 * Get a user setting by key
 */
export function getUserSetting(key: string): string | null {
    if (!db) throw new Error('Database not initialized');
    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_USER_SETTING, [key]);

    if (result.length === 0 || !result[0] || result[0].values.length === 0) return null;
    return (result[0].values[0]?.[0] as string) || null;
}

/**
 * Set a user setting
 */
export function setUserSetting(key: string, value: string): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    db.run(SQL_QUERIES.INSERT_USER_SETTING, [key, value, now]);
}

/**
 * Get a sync metadata value by key
 */
export function getSyncMetadata(key: string): string | null {
    if (!db) throw new Error('Database not initialized');
    const result: Array<QueryExecResult> = db.exec(SQL_QUERIES.SELECT_SYNC_METADATA, [key]);

    if (result.length === 0 || !result[0] || result[0].values.length === 0) return null;
    return (result[0].values[0]?.[0] as string) || null;
}

/**
 * Set a sync metadata value
 */
export function setSyncMetadata(key: string, value: string): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    db.run(SQL_QUERIES.INSERT_SYNC_METADATA, [key, value, now]);
}

/**
 * Clear all data (for testing)
 */
export function clearDatabase(): void {
    if (!db) throw new Error('Database not initialized');

    db.run('BEGIN TRANSACTION');
    try {
        db.run(SQL_QUERIES.DELETE_ALL_SPLITS, [new Date().toISOString()]);
        db.run(SQL_QUERIES.DELETE_ALL_TRANSACTIONS, [new Date().toISOString()]);
        db.run('UPDATE categories SET isDeleted = 1, updatedAt = ?', [new Date().toISOString()]);
        db.run('UPDATE payees SET isDeleted = 1, updatedAt = ?', [new Date().toISOString()]);
        db.run('UPDATE accounts SET isDeleted = 1, updatedAt = ?', [new Date().toISOString()]);
        db.run('UPDATE recurring_schedules SET isDeleted = 1, updatedAt = ?', [
            new Date().toISOString(),
        ]);
        db.run('UPDATE recurring_splits SET isDeleted = 1, updatedAt = ?', [
            new Date().toISOString(),
        ]);
        db.run('UPDATE loan_details SET isDeleted = 1, updated_at = ?', [new Date().toISOString()]);
        // User settings and Sync metadata are preserved
        db.run('COMMIT');
    } catch (e) {
        db.run('ROLLBACK');
        throw e;
    }
}
/**
 * Get all recurring schedules
 */
export function getAllRecurringSchedules(): Array<IRecurringSchedule> {
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(SQL_QUERIES.SELECT_ALL_RECURRING_SCHEDULES);
    if (result.length === 0 || !result[0]) return [];

    return result[0].values.map(row => {
        const scheduleId = row[0] as string;

        // Fetch splits for this schedule
        const splitResult = db?.exec(SQL_QUERIES.SELECT_RECURRING_SPLITS_BY_SCHEDULE, [scheduleId]);
        const splits: Array<ISplit> = [];

        if (splitResult && splitResult[0]) {
            for (const splitRow of splitResult[0].values) {
                splits.push({
                    id: splitRow[0] as string,
                    amount: splitRow[4] as number,
                    memo: (splitRow[3] as string) || '',
                    categoryId: (splitRow[2] as string) || null,
                });
            }
        }

        return {
            id: scheduleId,
            accountId: row[1] as string,
            payee: row[2] as string,
            amount: row[3] as number,
            type: row[4] as IRecurringSchedule['type'],
            frequency: row[5] as IRecurringSchedule['frequency'],
            paymentMethod: row[6] as IRecurringSchedule['paymentMethod'],
            startDate: row[7] as ISODateString,
            endDate: (row[8] as string) || null,
            nextDueDate: row[9] as ISODateString,
            lastOccurredDate: (row[10] as string) || null,
            memo: row[11] as string,
            autoPost: Boolean(row[12]),
            isActive: Boolean(row[13]),
            splits,
        };
    }) as Array<IRecurringSchedule>;
}

/**
 * Insert a new recurring schedule
 */
export function insertRecurringSchedule(schedule: IRecurringSchedule): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

    db.run(SQL_QUERIES.INSERT_RECURRING_SCHEDULE, [
        schedule.id,
        schedule.accountId,
        schedule.payee,
        schedule.amount,
        schedule.type,
        schedule.frequency,
        schedule.paymentMethod,
        schedule.startDate,
        schedule.endDate || null,
        schedule.nextDueDate,
        schedule.lastOccurredDate || null,
        schedule.memo,
        schedule.autoPost ? 1 : 0,
        schedule.isActive ? 1 : 0,
        0, // isDeleted
        clientId,
        now,
        now,
    ]);

    // Insert splits
    for (const split of schedule.splits) {
        db.run(SQL_QUERIES.INSERT_RECURRING_SPLIT, [
            split.id,
            schedule.id,
            split.categoryId || null,
            split.memo,
            split.amount,
            0, // isDeleted
            clientId,
            now,
        ]);
    }
}

/**
 * Update an existing recurring schedule
 */
export function updateRecurringSchedule(schedule: IRecurringSchedule): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    const clientId: string = getClientId();

    db.run(SQL_QUERIES.UPDATE_RECURRING_SCHEDULE, [
        schedule.accountId,
        schedule.payee,
        schedule.amount,
        schedule.type,
        schedule.frequency,
        schedule.paymentMethod,
        schedule.startDate,
        schedule.endDate || null,
        schedule.nextDueDate,
        schedule.lastOccurredDate || null,
        schedule.memo,
        schedule.autoPost ? 1 : 0,
        schedule.isActive ? 1 : 0,
        0, // isDeleted
        clientId,
        now,
        schedule.id,
    ]);

    // Update splits (delete and re-insert)
    db.run(SQL_QUERIES.DELETE_RECURRING_SPLITS_BY_SCHEDULE, [now, schedule.id]);
    for (const split of schedule.splits) {
        db.run(SQL_QUERIES.INSERT_RECURRING_SPLIT, [
            split.id,
            schedule.id,
            split.categoryId || null,
            split.memo,
            split.amount,
            0, // isDeleted
            clientId,
            now,
        ]);
    }
}

/**
 * Delete a recurring schedule
 */
export function deleteRecurringSchedule(id: string): void {
    if (!db) throw new Error('Database not initialized');
    db.run(SQL_QUERIES.DELETE_RECURRING_SCHEDULE, [id]);
}
export function deletePayee(payeeId: string): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    db.run(SQL_QUERIES.DELETE_PAYEE, [now, payeeId]);
}

export function deleteCategory(categoryId: string): void {
    if (!db) throw new Error('Database not initialized');
    const now: string = new Date().toISOString();
    db.run(SQL_QUERIES.DELETE_CATEGORY, [now, categoryId]);
}
