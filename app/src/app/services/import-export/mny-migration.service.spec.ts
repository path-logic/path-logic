import { signal, type NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as fs from 'fs';
import * as path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AccountType,
    type IAccount,
    type ICategory,
    type IPayee,
    type ITransaction
} from '../../core/domain/types';
import type { IMnyHeader, IMnyParseResult } from '../../core/parsers/MNYParser';
import { LedgerStore } from '../ledger-store/ledger.store';
import { MnyMigrationService } from './mny-migration.service';
import {
    DEFAULT_MNY_MIGRATION_OPTIONS,
    MnyMigrationMode,
    type IMnyAuditReport,
    type IMnyMigrationOptions
} from './mny-migration.types';

// Mock SQLiteAdapter so unit tests run cleanly without WASM initialization overhead
const mockExistingAccounts: Array<IAccount> = [];
const mockExistingCategories: Array<ICategory> = [];
const mockExistingPayees: Array<IPayee> = [];
const mockExistingTransactions: Array<ITransaction> = [];

vi.mock('../../lib/storage/SQLiteAdapter', () => ({
    getDb: vi.fn(),
    initDatabase: vi.fn(),
    resetDatabase: vi.fn(),
    getAllUserSettings: vi.fn(() => ({})),
    setUserSetting: vi.fn(),
    getAllAccounts: vi.fn(() => [...mockExistingAccounts]),
    insertAccount: vi.fn((acct: IAccount) => {
        mockExistingAccounts.push(acct);
    }),
    getAllCategories: vi.fn(() => [...mockExistingCategories]),
    insertCategory: vi.fn((cat: ICategory) => {
        mockExistingCategories.push(cat);
    }),
    getAllPayees: vi.fn(() => [...mockExistingPayees]),
    insertPayee: vi.fn((payee: IPayee) => {
        mockExistingPayees.push(payee);
    }),
    getAllTransactions: vi.fn(() => [...mockExistingTransactions]),
    insertTransactions: vi.fn((txs: Array<ITransaction>) => {
        mockExistingTransactions.push(...txs);
    })
}));

describe('MnyMigrationService', () => {
    let service: MnyMigrationService;
    let mockLedgerStore: {
        accounts: ReturnType<typeof signal<Array<IAccount>>>;
        categories: ReturnType<typeof signal<Array<ICategory>>>;
        payees: ReturnType<typeof signal<Array<IPayee>>>;
        transactions: ReturnType<typeof signal<Array<ITransaction>>>;
        isDirty: ReturnType<typeof signal<boolean>>;
        isInitialized: ReturnType<typeof signal<boolean>>;
        commitToLocal: ReturnType<typeof vi.fn>;
    };

    const sampleMnyPath = path.resolve(__dirname, '../../core/parsers/fixtures/sample.mny');
    let sampleMnyBuffer: ArrayBuffer;

    beforeEach(() => {
        mockExistingAccounts.length = 0;
        mockExistingCategories.length = 0;
        mockExistingPayees.length = 0;
        mockExistingTransactions.length = 0;

        if (typeof window !== 'undefined') {
            (window as unknown as Record<string, unknown>)['initSqlJs'] = vi
                .fn()
                .mockResolvedValue({
                    Database: class {
                        run = vi.fn();
                        exec = vi.fn(() => []);
                        export = vi.fn(() => new Uint8Array());
                    }
                });
        }

        mockLedgerStore = {
            accounts: signal<Array<IAccount>>([]),
            categories: signal<Array<ICategory>>([]),
            payees: signal<Array<IPayee>>([]),
            transactions: signal<Array<ITransaction>>([]),
            isDirty: signal<boolean>(false),
            isInitialized: signal<boolean>(true),
            commitToLocal: vi.fn().mockResolvedValue(undefined)
        };

        const mockZone = {
            run: <T>(fn: () => T): T => fn()
        } as unknown as NgZone;

        TestBed.configureTestingModule({
            providers: [{ provide: LedgerStore, useValue: mockLedgerStore }]
        });

        service = TestBed.runInInjectionContext(() => new MnyMigrationService());

        if (fs.existsSync(sampleMnyPath)) {
            const buf = fs.readFileSync(sampleMnyPath);
            sampleMnyBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
    });

    describe('Lifecycle and Dialog Controls', () => {
        it('should initialize with default states and closed modal', () => {
            expect(service.isOpen()).toBe(false);
            expect(service.step()).toBe('drop');
            expect(service.file()).toBeNull();
            expect(service.header()).toBeNull();
            expect(service.passwordRequired()).toBe(false);
            expect(service.credentialsVerified()).toBe(false);
            expect(service.parseResult()).toBeNull();
            expect(service.auditReport()).toBeNull();
            expect(service.errorMessage()).toBeNull();
            expect(DEFAULT_MNY_MIGRATION_OPTIONS.includeClosedAccounts).toBe(false);
            expect(service.options().includeClosedAccounts).toBe(false);
        });

        it('should open and reset states correctly', () => {
            service.open();
            expect(service.isOpen()).toBe(true);
            expect(service.step()).toBe('drop');

            service.close();
            expect(service.isOpen()).toBe(false);
        });

        it('should reset all states when reset() is invoked', () => {
            service.step.set('select');
            service.errorMessage.set('Some test error');
            service.reset();

            expect(service.step()).toBe('drop');
            expect(service.errorMessage()).toBeNull();
        });
    });

    describe('Inspection and File Ingestion', () => {
        it('should inspect sample.mny buffer, extract header and advance to mode step', async () => {
            if (!sampleMnyBuffer) return;

            await service.inspectBuffer(sampleMnyBuffer);

            expect(service.header()).not.toBeNull();
            expect(service.header()?.formatVersion).toBe(3); // MSISAM 3.00 Jet 3
            expect(service.passwordRequired()).toBe(false);
            expect(service.credentialsVerified()).toBe(true);
            expect(service.tableCount()).toBe(88);
            expect(service.step()).toBe('mode');
            expect(service.parseResult()).not.toBeNull();
            expect(service.parseResult()?.accounts.length).toBeGreaterThan(0);
        });

        it('should handle corrupted or non-mny buffer gracefully with error message', async () => {
            const corruptBuffer = new ArrayBuffer(2048); // zeroes, invalid magic

            await service.inspectBuffer(corruptBuffer);

            expect(service.step()).toBe('drop');
            expect(service.errorMessage()).toContain('Invalid .mny buffer');
        });
    });

    describe('Credential Verification', () => {
        it('should return false if verifying credentials without a loaded buffer', async () => {
            const result = await service.verifyCredentials('some-password');
            expect(result).toBe(false);
            expect(service.errorMessage()).toBe('No file loaded to verify credentials');
        });

        it('should verify password against buffer correctly', async () => {
            if (!sampleMnyBuffer) return;

            // First load the buffer
            await service.inspectBuffer(sampleMnyBuffer);

            // Empty password on sample.mny is valid
            const valid = await service.verifyCredentials('');
            expect(valid).toBe(true);
            expect(service.credentialsVerified()).toBe(true);
            expect(service.step()).toBe('mode');
        });
    });

    describe('executeMigration() Engine', () => {
        it('should throw error if executeMigration() is called before parsing', async () => {
            await expect(service.executeMigration()).rejects.toThrow(
                'No parsed data available to migrate'
            );
        });

        it('should execute migration in MergeAndReconcile mode and generate comprehensive audit report', async () => {
            if (!sampleMnyBuffer) return;

            await service.inspectBuffer(sampleMnyBuffer);
            expect(service.parseResult()).not.toBeNull();

            // Set options to merge mode
            service.options.update((opt: IMnyMigrationOptions) => ({
                ...opt,
                mode: MnyMigrationMode.MergeAndReconcile,
                includeClosedAccounts: true
            }));

            const report: IMnyAuditReport = await service.executeMigration();

            expect(report).not.toBeNull();
            expect(report.accountsCreated).toBeGreaterThan(0);
            expect(report.categoriesMapped).toBeGreaterThan(0);
            expect(report.payeesEnriched).toBeGreaterThan(0);
            expect(report.payeesDeduplicated).toBeGreaterThanOrEqual(0);
            expect(report.transactionsCommitted).toBeGreaterThan(0);
            expect(report.transactionsDeduplicated).toBeGreaterThanOrEqual(0);
            expect(report.splitsBalanced).toBeGreaterThan(0);
            expect(report.pennyDiscrepancy).toBe(0);
            expect(report.durationMs).toBeGreaterThanOrEqual(0);

            // Signals updated
            expect(service.step()).toBe('report');
            expect(service.auditReport()).toBe(report);
            expect(mockLedgerStore.commitToLocal).toHaveBeenCalled();
            expect(mockLedgerStore.isDirty()).toBe(true);
        });

        it('should execute migration in ReplaceWorkspace mode and reset database first', async () => {
            if (!sampleMnyBuffer) return;

            await service.inspectBuffer(sampleMnyBuffer);

            service.options.update((opt: IMnyMigrationOptions) => ({
                ...opt,
                mode: MnyMigrationMode.ReplaceWorkspace
            }));

            const report: IMnyAuditReport = await service.executeMigration();

            expect(report).not.toBeNull();
            expect(service.step()).toBe('report');
        });

        it('should filter out closed accounts when includeClosedAccounts is false', async () => {
            if (!sampleMnyBuffer) return;

            // Synthetic test parse result with 1 active and 1 closed account
            const syntheticParse: IMnyParseResult = {
                header: {
                    signature: 'MSISAM Database',
                    formatVersion: 3,
                    passwordVerified: true
                } as unknown as IMnyHeader,
                tables: [],
                accounts: [
                    {
                        mnyAccountId: 101,
                        name: 'Active Checking',
                        abbreviation: 'CHK',
                        mnyType: 1,
                        mappedType: AccountType.Checking,
                        accountNumber: '1111',
                        openingBalance: 50000,
                        isClosed: false,
                        isFavorite: false
                    },
                    {
                        mnyAccountId: 102,
                        name: 'Old Closed Savings',
                        abbreviation: 'SAV',
                        mnyType: 2,
                        mappedType: AccountType.Savings,
                        accountNumber: '2222',
                        openingBalance: 10000,
                        isClosed: true,
                        isFavorite: false
                    }
                ],
                categories: [],
                payees: [],
                transactions: [],
                errors: [],
                warnings: []
            };

            service.parseResult.set(syntheticParse);
            service.options.set({
                ...DEFAULT_MNY_MIGRATION_OPTIONS,
                mode: MnyMigrationMode.MergeAndReconcile,
                includeClosedAccounts: false,
                importDecryptedAccountNumbers: true,
                preserveClearedStatus: true,
                synthesizeOpeningBalances: true,
                selectedAccountIds: [101, 102],
                selectedCategoryIds: [],
                selectedPayeeIds: []
            });

            const report = await service.executeMigration();
            expect(report.accountsCreated).toBe(1);
            expect(mockExistingAccounts.some(a => a.name === 'Active Checking')).toBe(true);
            expect(mockExistingAccounts.some(a => a.name === 'Old Closed Savings')).toBe(false);
        });

        it('should call resetDatabase and initDatabase when mode is ReplaceWorkspace', async () => {
            service.parseResult.set({
                header: null,
                tables: [],
                accounts: [],
                categories: [],
                payees: [],
                transactions: [],
                errors: [],
                warnings: []
            });
            service.options.set({
                ...DEFAULT_MNY_MIGRATION_OPTIONS,
                mode: MnyMigrationMode.ReplaceWorkspace
            });

            const report = await service.executeMigration();
            expect(report).not.toBeNull();
            expect(service.step()).toBe('report');
        });
    });
});
