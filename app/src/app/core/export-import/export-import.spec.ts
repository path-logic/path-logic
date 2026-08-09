import { AccountType, TransactionStatus } from '../domain/types';
import { computeSHA256, decryptPayload, encryptPayload } from './crypto/payload-cipher';
import { CorruptionDetector } from './engine/corruption-detector';
import { ExportCleaner } from './engine/export-cleaner';
import { ExportConsolidator } from './engine/export-consolidator';
import { AncillarySerializer } from './serializers/AncillarySerializer';
import type { IAncillaryPayload } from './types/export-import.types';

describe('ExportImport Module', () => {
    describe('AncillarySerializer Security', () => {
        it('should strictly exclude AI key and sensitive credentials', () => {
            const rawPayload = {
                categories: [],
                payees: [],
                recurringSchedules: [],
                featureFlags: {
                    dev: true,
                    aiApiKey: 'SECRET_AI_KEY_123'
                },
                userSettings: {
                    theme: 'dark',
                    geminiApiKey: 'GEMINI_SECRET_KEY',
                    token: 'OAUTH_TOKEN_SECRET'
                }
            };

            const serialized = AncillarySerializer.serialize(
                rawPayload as unknown as IAncillaryPayload
            );
            expect(serialized).not.toContain('SECRET_AI_KEY_123');
            expect(serialized).not.toContain('GEMINI_SECRET_KEY');
            expect(serialized).not.toContain('OAUTH_TOKEN_SECRET');

            const deserialized = AncillarySerializer.deserialize(serialized);
            expect(deserialized.userSettings.theme).toBe('dark');
            expect(deserialized.userSettings['geminiApiKey']).toBeUndefined();
            expect(deserialized.featureFlags['aiApiKey']).toBeUndefined();
        });
    });

    describe('Payload Cipher & Hashing', () => {
        it('should encrypt and decrypt payloads with AES-GCM 256', async () => {
            const text = 'Hello Path Logic Encryption';
            const pass = 'secret-passphrase';

            const encrypted = await encryptPayload(text, pass);
            expect(encrypted).not.toBe(text);

            const decrypted = await decryptPayload(encrypted, pass);
            expect(decrypted).toBe(text);
        });

        it('should compute consistent SHA-256 hashes', async () => {
            const data = 'Path Logic Checksum';
            const hash1 = await computeSHA256(data);
            const hash2 = await computeSHA256(data);
            expect(hash1).toBe(hash2);
            expect(hash1.length).toBe(64);
        });
    });

    describe('ExportCleaner Retention Rules', () => {
        it('should identify old packages for deletion based on keepLatestCount', () => {
            const folders = [
                {
                    folderId: 'f1',
                    folderName: '20260808_01',
                    createdAt: '2026-08-08T10:00:00.000Z'
                },
                {
                    folderId: 'f2',
                    folderName: '20260808_02',
                    createdAt: '2026-08-08T12:00:00.000Z'
                },
                { folderId: 'f3', folderName: '20260808_03', createdAt: '2026-08-08T14:00:00.000Z' }
            ];

            const toDelete = ExportCleaner.evaluateRetentionPolicy(folders, { keepLatestCount: 2 });
            expect(toDelete).toEqual(['f1']);
        });
    });

    describe('ExportConsolidator Diffing', () => {
        it('should merge same-day exports without duplicating transactions', () => {
            const pkg1 = {
                folderName: '20260808_01',
                metadata: {
                    exportId: 'e1',
                    createdAt: '2026-08-08T08:00:00.000Z',
                    appVersion: '0.1.0',
                    coreVersion: '0.1.0',
                    accounts: [],
                    ancillaryFile: {
                        filename: 'anc.enc',
                        sha256: 'a',
                        algorithm: 'AES-GCM-256' as const
                    },
                    overallChecksum: 'chk1'
                },
                accounts: [
                    {
                        account: {
                            id: 'acc1',
                            name: 'Checking',
                            type: AccountType.Checking,
                            institutionName: 'Bank',
                            clearedBalance: 1000,
                            pendingBalance: 1000,
                            isActive: true,
                            createdAt: '2026-01-01',
                            updatedAt: '2026-01-01',
                            deletedAt: null
                        },
                        transactions: [
                            {
                                id: 't1',
                                accountId: 'acc1',
                                payeeId: 'p1',
                                date: '2026-08-08',
                                payee: 'Groceries',
                                memo: '',
                                totalAmount: -5000,
                                status: TransactionStatus.Cleared,
                                splits: [{ id: 's1', categoryId: null, memo: '', amount: -5000 }],
                                checkNumber: null,
                                importHash: 'h1',
                                createdAt: '2026-08-08',
                                updatedAt: '2026-08-08'
                            }
                        ]
                    }
                ],
                ancillaryPayload: {
                    categories: [],
                    payees: [],
                    recurringSchedules: [],
                    featureFlags: { flag1: true },
                    userSettings: {}
                }
            };

            const consolidated = ExportConsolidator.consolidateSameDayExports([pkg1], '20260808');
            expect(consolidated.mergedAccountCount).toBe(1);
            expect(consolidated.mergedTransactionCount).toBe(1);
        });
    });

    describe('CorruptionDetector Integrty', () => {
        it('should detect checksum mismatch', async () => {
            const metadata = {
                exportId: 'e1',
                createdAt: '2026-08-08',
                appVersion: '0.1.0',
                coreVersion: '0.1.0',
                accounts: [
                    {
                        id: 'acc1',
                        name: 'Checking',
                        type: AccountType.Checking,
                        snakeCaseFilename: 'checking.qif.enc',
                        transactionCount: 1,
                        balanceCents: 1000,
                        sha256: 'EXPECTED_HASH'
                    }
                ],
                ancillaryFile: {
                    filename: 'anc.enc',
                    sha256: 'xyz',
                    algorithm: 'AES-GCM-256' as const
                },
                overallChecksum: 'master'
            };

            const files = [{ filename: 'checking.qif.enc', encryptedContent: 'CORRUPTED_CONTENT' }];

            const report = await CorruptionDetector.verifyExportIntegrity(metadata, files);
            expect(report.hasCorruption).toBe(true);
            expect(report.invalidChecksumFiles).toContain('checking.qif.enc');
        });
    });
});
