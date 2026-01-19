'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { ITransaction } from '@path-logic/core';
import { TransactionStatus, QIFParser, KnownCategory } from '@path-logic/core';
import { useLedgerStore } from '@/store/ledgerStore';
import { getSyncStatus, loadFromDrive, saveToDrive } from '@/lib/sync/syncService';
import { exportDatabase } from '@/lib/storage/SQLiteAdapter';
import { encryptDatabase, decryptDatabase } from '@/lib/crypto/encryption';
import { findDatabaseFile, downloadDatabase } from '@/lib/storage/GoogleDriveAdapter';
import { generateTestDataset, createTestTransaction } from '@/lib/testing/testData';
import { DataInspector } from './components/DataInspector';
import { SyncStatusPanel } from './components/SyncStatusPanel';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import { compareTransactions } from './utils/devUtils';

export default function SyncTestPage(): React.ReactElement {
    const { data: session } = useSession();
    const { transactions, addTransaction, initialize } = useLedgerStore();

    // State for data inspection
    const [rawData, setRawData] = useState<Uint8Array | null>(null);
    const [encryptedData, setEncryptedData] = useState<Uint8Array | null>(null);
    const [driveMetadata, setDriveMetadata] = useState<{ id: string; modifiedTime: string; size: number } | null>(null);
    const [restoredTransactions, setRestoredTransactions] = useState<Array<ITransaction>>([]);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Performance Metrics
    const [metrics, setMetrics] = useState<{
        exportTimeMs: number;
        encryptionTimeMs: number;
        uploadTimeMs: number;
        downloadTimeMs: number;
        decryptionTimeMs: number;
        importLoadTimeMs?: number;
        importParseTimeMs?: number;
        importMapTimeMs?: number;
        importStoreTimeMs?: number;
        rawSize: number;
        encryptedSize: number;
        recordCount: number;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for custom transaction creation
    const [customPayee, setCustomPayee] = useState<string>('');
    const [customAmount, setCustomAmount] = useState<string>('');
    const [customMemo, setCustomMemo] = useState<string>('');

    // Sync status polling
    const [syncStatus, setSyncStatus] = useState(getSyncStatus());

    useEffect((): (() => void) => {
        const interval: NodeJS.Timeout = setInterval((): void => {
            setSyncStatus(getSyncStatus());
        }, 500);

        return (): void => clearInterval(interval);
    }, []);

    // Initialize database on mount
    useEffect((): void => {
        initialize();
    }, [initialize]);

    const handleLoadTestData = async (): Promise<void> => {
        try {
            const testTxs: Array<ITransaction> = generateTestDataset();
            for (const tx of testTxs) {
                await addTransaction(tx);
            }
        } catch (error) {
            console.error('Failed to load test data:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleCreateCustomTransaction = async (): Promise<void> => {
        if (!customPayee || !customAmount) {
            setSyncError('Payee and amount are required');
            return;
        }

        try {
            const amount: number = Math.round(parseFloat(customAmount) * 100);
            const tx: ITransaction = createTestTransaction(
                `custom-${Date.now()}`,
                new Date().toISOString().split('T')[0] as `${number}-${number}-${number}`,
                customPayee,
                amount,
                TransactionStatus.Cleared
            );

            // Override memo if provided
            if (customMemo) {
                tx.memo = customMemo;
                tx.splits[0]!.memo = customMemo;
            }

            await addTransaction(tx);

            // Clear form
            setCustomPayee('');
            setCustomAmount('');
            setCustomMemo('');
            setSyncError(null);
        } catch (error) {
            console.error('Failed to create transaction:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleQifImport = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const loadStart = performance.now();
            const content = await file.text();
            const loadEnd = performance.now();

            const parseStart = performance.now();
            const parser = new QIFParser();
            const result = parser.parse(content);
            const parseEnd = performance.now();

            if (result.errors.length > 0) {
                setSyncError(`QIF Parse Error: ${result.errors[0]?.message}`);
                return;
            }

            const mapStart = performance.now();
            const now = new Date().toISOString() as `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;
            const mappedTxs: Array<ITransaction> = result.transactions.map((pt, index: number): ITransaction => ({
                id: `qif-${Date.now()}-${index}`,
                accountId: 'test-account',
                payeeId: 'payee-legacy-import',
                date: pt.date,
                payee: pt.payee,
                memo: pt.memo || '',
                totalAmount: pt.amount,
                status: TransactionStatus.Cleared,
                checkNumber: pt.checkNumber || '',
                importHash: pt.importHash || '',
                createdAt: now,
                updatedAt: now,
                splits: pt.splits.map((s, si: number) => ({
                    id: `qif-${Date.now()}-${index}-s${si}`,
                    amount: s.amount,
                    memo: s.memo || '',
                    categoryId: s.category || KnownCategory.Uncategorized
                }))
            }));

            // If no splits, create a default one
            mappedTxs.forEach((tx: ITransaction): void => {
                if (tx.splits.length === 0) {
                    tx.splits.push({
                        id: `${tx.id}-split-0`,
                        amount: tx.totalAmount,
                        memo: tx.memo,
                        categoryId: KnownCategory.Uncategorized
                    });
                }
            });
            const mapEnd = performance.now();

            const storeStart = performance.now();
            await useLedgerStore.getState().addTransactions(mappedTxs);
            const storeEnd = performance.now();

            setMetrics({
                exportTimeMs: 0,
                encryptionTimeMs: 0,
                uploadTimeMs: 0,
                downloadTimeMs: 0,
                decryptionTimeMs: 0,
                importLoadTimeMs: loadEnd - loadStart,
                importParseTimeMs: parseEnd - parseStart,
                importMapTimeMs: mapEnd - mapStart,
                importStoreTimeMs: storeEnd - storeStart,
                rawSize: content.length,
                encryptedSize: 0,
                recordCount: mappedTxs.length,
            });

            setSyncError(null);

            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            console.error('QIF Import failed:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleExportData = async (): Promise<void> => {
        try {
            const exported: Uint8Array = exportDatabase();
            setRawData(exported);
            setSyncError(null);
        } catch (error) {
            console.error('Failed to export data:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleEncryptData = async (): Promise<void> => {
        if (!session?.user?.id) {
            setSyncError('No user session');
            return;
        }

        try {
            const exported: Uint8Array = exportDatabase();
            const encrypted: Uint8Array = await encryptDatabase(exported, session.user.id);
            setEncryptedData(encrypted);
            setSyncError(null);
        } catch (error) {
            console.error('Failed to encrypt data:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleUploadToDrive = async (): Promise<void> => {
        if (!session?.accessToken || !session?.user?.id) {
            setSyncError('No session or access token');
            return;
        }

        try {

            const exportStart = performance.now();
            const exported: Uint8Array = exportDatabase();
            const exportEnd = performance.now();

            const encryptStart = performance.now();
            const encrypted: Uint8Array = await encryptDatabase(exported, session.user.id);
            const encryptEnd = performance.now();

            const uploadStart = performance.now();
            await saveToDrive(session.accessToken, session.user.id);
            const uploadEnd = performance.now();

            // Fetch metadata
            const file = await findDatabaseFile(session.accessToken);
            if (file) {
                setDriveMetadata({
                    id: file.id,
                    modifiedTime: file.modifiedTime,
                    size: 0,
                });
            }

            setMetrics((prev) => ({
                ...(prev || { downloadTimeMs: 0, decryptionTimeMs: 0 }),
                exportTimeMs: exportEnd - exportStart,
                encryptionTimeMs: encryptEnd - encryptStart,
                uploadTimeMs: uploadEnd - uploadStart,
                rawSize: exported.length,
                encryptedSize: encrypted.length,
                recordCount: transactions.length,
            }));

            setSyncError(null);
        } catch (error) {
            console.error('Failed to upload to Drive:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleDownloadFromDrive = async (): Promise<void> => {
        if (!session?.accessToken || !session?.user?.id) {
            setSyncError('No session or access token');
            return;
        }

        try {
            const file = await findDatabaseFile(session.accessToken);
            if (!file) throw new Error('No database file found on Drive');

            const downloadStart = performance.now();
            const encryptedData: Uint8Array = await downloadDatabase(session.accessToken, file.id);
            const downloadEnd = performance.now();

            const decryptStart = performance.now();
            const decrypted: Uint8Array = await decryptDatabase(encryptedData, session.user.id);
            const decryptEnd = performance.now();

            // Actually load it to trigger state update
            await loadFromDrive(session.accessToken, session.user.id);

            const currentTxs = useLedgerStore.getState().transactions;
            setRestoredTransactions([...currentTxs]);

            setMetrics((prev) => ({
                ...(prev || { exportTimeMs: 0, encryptionTimeMs: 0, uploadTimeMs: 0, rawSize: 0, encryptedSize: 0, recordCount: 0 }),
                downloadTimeMs: downloadEnd - downloadStart,
                decryptionTimeMs: decryptEnd - decryptStart,
                recordCount: currentTxs.length,
                encryptedSize: encryptedData.length,
                rawSize: decrypted.length
            }));

            setSyncError(null);
        } catch (error) {
            console.error('Failed to download from Drive:', error);
            setSyncError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const comparison = compareTransactions(transactions, restoredTransactions);

    if (!session) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Please sign in to use sync test tools</h1>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Sync Test Suite</h1>
                <p className="mt-2 text-gray-600">
                    Manually verify the complete data sync pipeline: SQLite → Encryption → Google Drive → Decryption
                </p>
            </div>

            {/* Test Data Section */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Test Data</h2>

                <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Current Transactions:</p>
                        <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Amount:</p>
                        <p className="text-2xl font-bold text-gray-900">
                            ${(transactions.reduce((sum: number, tx: ITransaction): number => sum + tx.totalAmount, 0) / 100).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-700">Load Default Test Data</h3>
                        <button
                            onClick={handleLoadTestData}
                            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                            type="button"
                        >
                            Load Test Transactions
                        </button>
                    </div>

                    <div>
                        <h3 className="mb-2 font-semibold text-gray-700">Create Custom Transaction</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Payee"
                                value={customPayee}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCustomPayee(e.target.value)}
                                className="rounded border border-gray-300 px-3 py-2"
                            />
                            <input
                                type="number"
                                placeholder="Amount (e.g., 25.50)"
                                value={customAmount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCustomAmount(e.target.value)}
                                className="rounded border border-gray-300 px-3 py-2"
                                step="0.01"
                            />
                            <input
                                type="text"
                                placeholder="Memo (optional)"
                                value={customMemo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCustomMemo(e.target.value)}
                                className="rounded border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <button
                            onClick={handleCreateCustomTransaction}
                            className="mt-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                            type="button"
                        >
                            Create Transaction
                        </button>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="mb-2 font-semibold text-gray-700">Bulk Import QIF</h3>
                        <p className="text-xs text-gray-500 mb-3">Upload a .qif file to test with large datasets (e.g. 6,500+ records).</p>
                        <input
                            type="file"
                            accept=".qif"
                            ref={fileInputRef}
                            onChange={handleQifImport}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                            type="button"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Select QIF File
                        </button>
                    </div>
                </div>

                {/* Transaction List */}
                {transactions.length > 0 && (
                    <div className="mt-4 max-h-60 overflow-auto rounded border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Date</th>
                                    <th className="px-4 py-2 text-left">Payee</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx: ITransaction): React.ReactElement => (
                                    <tr key={tx.id} className="border-t border-gray-200">
                                        <td className="px-4 py-2">{tx.date}</td>
                                        <td className="px-4 py-2">{tx.payee}</td>
                                        <td className="px-4 py-2 text-right">
                                            ${(tx.totalAmount / 100).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sync Controls */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">Data Export & Encryption</h2>
                    <div className="space-y-2">
                        <button
                            onClick={handleExportData}
                            className="w-full rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                            type="button"
                        >
                            Export SQLite Data
                        </button>
                        <button
                            onClick={handleEncryptData}
                            className="w-full rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                            type="button"
                        >
                            Encrypt Data
                        </button>
                        <button
                            onClick={handleUploadToDrive}
                            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                            type="button"
                            disabled={syncStatus.inProgress}
                        >
                            Upload to Google Drive
                        </button>
                    </div>
                </div>

                <SyncStatusPanel status={syncStatus} error={syncError} />
            </div>

            <PerformanceMetrics metrics={metrics} />

            {/* Data Inspection */}
            <div className="grid grid-cols-2 gap-4">
                <DataInspector
                    title="Raw SQLite Export"
                    data={rawData}
                    description="Unencrypted database binary data"
                />
                <DataInspector
                    title="Encrypted Data"
                    data={encryptedData}
                    description="AES-GCM encrypted with IV prepended"
                />
            </div>

            {/* Google Drive Metadata */}
            {driveMetadata && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="mb-2 font-semibold text-gray-900">Google Drive File</h3>
                    <div className="space-y-1 text-sm">
                        <div>
                            <span className="text-gray-600">File ID:</span>{' '}
                            <span className="font-mono text-gray-900">{driveMetadata.id}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Modified:</span>{' '}
                            <span className="font-mono text-gray-900">{driveMetadata.modifiedTime}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Download & Restore */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Download & Restore</h2>
                <button
                    onClick={handleDownloadFromDrive}
                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    type="button"
                    disabled={syncStatus.inProgress}
                >
                    Download from Google Drive
                </button>

                {restoredTransactions.length > 0 && (
                    <div className="mt-4">
                        <h3 className="mb-2 font-semibold text-gray-700">Restored Transactions: {restoredTransactions.length}</h3>
                        <div className={`rounded p-3 ${comparison.match ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className={`font-semibold ${comparison.match ? 'text-green-700' : 'text-red-700'}`}>
                                {comparison.match ? '✓ Data matches perfectly!' : '✗ Data mismatch detected'}
                            </p>
                            {!comparison.match && (
                                <ul className="mt-2 text-sm text-red-600">
                                    {comparison.differences.map((diff: string, i: number): React.ReactElement => (
                                        <li key={i}>• {diff}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
