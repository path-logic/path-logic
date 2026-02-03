'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { ITransaction } from '@path-logic/core';
import { TransactionStatus, QIFParser, KnownCategory } from '@path-logic/core';
import { useLedgerStore } from '@/store/ledgerStore';
import { getSyncStatus, loadFromDrive, saveToDrive } from '@/lib/sync/syncService';
import { exportDatabase } from '@/lib/storage/SQLiteAdapter';
import { encryptDatabase, decryptDatabase } from '@/lib/crypto/encryption';
import { findDatabaseFile, downloadDatabase } from '@/lib/storage/GoogleDriveAdapter';
import { generateTestDataset, createTestTransaction } from '@/lib/testing/testData';
import { Card } from '@/components/ui/card';
import {
    ArrowLeft,
    Database,
    Code,
    ShieldCheck,
    Cloud,
    Zap,
    AlertCircle,
    CheckCircle2,
    History,
    Lock,
    Globe,
    AlertTriangle,
} from 'lucide-react';

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
    const [driveMetadata, setDriveMetadata] = useState<{
        id: string;
        modifiedTime: string;
        size: number;
    } | null>(null);
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
                TransactionStatus.Cleared,
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
            const now =
                new Date().toISOString() as `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;
            const mappedTxs: Array<ITransaction> = result.transactions.map(
                (pt, index: number): ITransaction => ({
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
                        categoryId: s.category || KnownCategory.Uncategorized,
                    })),
                }),
            );

            // If no splits, create a default one
            mappedTxs.forEach((tx: ITransaction): void => {
                if (tx.splits.length === 0) {
                    tx.splits.push({
                        id: `${tx.id}-split-0`,
                        amount: tx.totalAmount,
                        memo: tx.memo,
                        categoryId: KnownCategory.Uncategorized,
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

            setMetrics(prev => ({
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

            setMetrics(prev => ({
                ...(prev || {
                    exportTimeMs: 0,
                    encryptionTimeMs: 0,
                    uploadTimeMs: 0,
                    rawSize: 0,
                    encryptedSize: 0,
                    recordCount: 0,
                }),
                downloadTimeMs: downloadEnd - downloadStart,
                decryptionTimeMs: decryptEnd - decryptStart,
                recordCount: currentTxs.length,
                encryptedSize: encryptedData.length,
                rawSize: decrypted.length,
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
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-widest">
                        Authentication Required
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Please sign in to access sync architecture diagnostics
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <header className="flex justify-between items-end border-b border-border/30 pb-8">
                <div className="space-y-1">
                    <Link
                        href="/settings/dev"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Back to Dev Tools
                    </Link>
                    <h1 className="text-xl font-black uppercase tracking-[0.2em] text-primary">
                        Sync <span className="text-foreground">Test Suite</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">
                        Diagnostics for the SQLite → Crypto → Cloud pipeline
                    </p>
                </div>
            </header>

            {/* Test Data Section */}
            <Card className="p-8">
                <div className="flex items-center gap-3 mb-8">
                    <Database className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-black uppercase tracking-widest">
                        Active Store Statistics
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                            Transaction Count
                        </p>
                        <p className="text-3xl font-black tabular-nums">{transactions.length}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                            Total Ledger Aggregate
                        </p>
                        <p className="text-3xl font-black tabular-nums">
                            $
                            {(
                                transactions.reduce(
                                    (sum: number, tx: ITransaction): number => sum + tx.totalAmount,
                                    0,
                                ) / 100
                            ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>
                    </div>
                </div>

                <div className="space-y-8 border-t border-border/20 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3 text-blue-500" />
                                Synthetic Data Injection
                            </h3>
                            <button
                                onClick={handleLoadTestData}
                                className="w-full h-11 rounded border border-blue-500/30 bg-blue-500/5 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-500/10 transition-colors"
                                type="button"
                            >
                                Inject Baseline Dataset
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <History className="w-3 h-3 text-indigo-500" />
                                Bulk Import Channel (QIF)
                            </h3>
                            <input
                                type="file"
                                accept=".qif"
                                ref={fileInputRef}
                                onChange={handleQifImport}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-11 rounded border border-indigo-500/30 bg-indigo-500/5 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2"
                                type="button"
                            >
                                <Cloud className="w-4 h-4" />
                                Stream QIF Binary
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Code className="w-3 h-3 text-emerald-500" />
                            Manual Entry Simulation
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="Payee"
                                value={customPayee}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                                    setCustomPayee(e.target.value)
                                }
                                className="h-11 rounded bg-muted/10 border border-border/50 px-4 text-xs font-bold focus:border-primary transition-colors"
                            />
                            <input
                                type="number"
                                placeholder="Amount (e.g., 25.50)"
                                value={customAmount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                                    setCustomAmount(e.target.value)
                                }
                                className="h-11 rounded bg-muted/10 border border-border/50 px-4 text-xs font-bold focus:border-primary transition-colors"
                                step="0.01"
                            />
                            <input
                                type="text"
                                placeholder="Memo (optional)"
                                value={customMemo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                                    setCustomMemo(e.target.value)
                                }
                                className="h-11 rounded bg-muted/10 border border-border/50 px-4 text-xs font-bold focus:border-primary transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleCreateCustomTransaction}
                            className="w-full h-11 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                            type="button"
                        >
                            Commit Single record
                        </button>
                    </div>
                </div>

                {/* Transaction Viewer */}
                {transactions.length > 0 && (
                    <div className="mt-8 overflow-hidden rounded-lg border border-border/20 bg-muted/5">
                        <div className="max-h-60 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/10 backdrop-blur-sm sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Payee
                                        </th>
                                        <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Value
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.slice(0, 100).map(
                                        (tx: ITransaction): React.ReactElement => (
                                            <tr
                                                key={tx.id}
                                                className="border-t border-border/5 hover:bg-primary/5 transition-colors"
                                            >
                                                <td className="px-6 py-3 text-[10px] font-bold font-mono opacity-60">
                                                    {tx.date}
                                                </td>
                                                <td className="px-6 py-3 text-[10px] font-bold uppercase tracking-tight">
                                                    {tx.payee}
                                                </td>
                                                <td className="px-6 py-3 text-right text-[10px] font-black tabular-nums">
                                                    ${(tx.totalAmount / 100).toFixed(2)}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    {transactions.length > 100 && (
                                        <tr className="bg-muted/5">
                                            <td
                                                colSpan={3}
                                                className="px-6 py-2 text-[9px] text-center font-bold uppercase text-muted-foreground/40 italic"
                                            >
                                                Showing first 100 of {transactions.length}{' '}
                                                records...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Card>

            {/* Sync Controls grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-sm font-black uppercase tracking-widest">
                            Pipeline Validation
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleExportData}
                            className="w-full h-12 rounded bg-muted/20 border border-border/50 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-colors flex items-center justify-center gap-3"
                            type="button"
                        >
                            <Database className="w-4 h-4 opacity-40" />
                            Dump SQLite Binary
                        </button>
                        <button
                            onClick={handleEncryptData}
                            className="w-full h-12 rounded bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-3"
                            type="button"
                        >
                            <Lock className="w-4 h-4" />
                            Execute AES-GCM Seal
                        </button>
                        <button
                            onClick={handleUploadToDrive}
                            className="w-full h-12 rounded bg-primary text-[10px] font-black uppercase tracking-widest text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                            type="button"
                            disabled={syncStatus.inProgress}
                        >
                            <Globe className="w-4 h-4" />
                            Transmit to Google Drive
                        </button>
                    </div>
                </Card>

                <SyncStatusPanel status={syncStatus} error={syncError} />
            </div>

            <PerformanceMetrics metrics={metrics} />

            {/* Data Inspection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DataInspector
                    title="Domain Binary (Raw)"
                    data={rawData}
                    description="Decrypted SQLite binary dump from memory"
                />
                <DataInspector
                    title="Ciphertext Binary"
                    data={encryptedData}
                    description="Encrypted payload with GCM Auth Tag"
                />
            </div>

            {/* Google Drive Metadata */}
            {driveMetadata && (
                <Card className="p-6 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3 mb-6">
                        <Cloud className="w-5 h-5 text-primary" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">
                            Remote Manifest (Cloud)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                                Resource Identifier
                            </span>
                            <span className="text-[10px] font-mono font-bold break-all">
                                {driveMetadata.id}
                            </span>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                                Last Write Timestamp
                            </span>
                            <span className="text-[10px] font-mono font-bold">
                                {driveMetadata.modifiedTime}
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Download & Restore */}
            <Card className="p-8 border-emerald-500/20 bg-emerald-500/5">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-emerald-500">
                            Restore Pipeline
                        </h2>
                    </div>
                    <button
                        onClick={handleDownloadFromDrive}
                        className="h-11 px-8 rounded bg-emerald-500 text-[10px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20"
                        type="button"
                        disabled={syncStatus.inProgress}
                    >
                        <Cloud className="w-4 h-4" />
                        Pull from Cloud
                    </button>
                </div>

                {restoredTransactions.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <div
                            className={`p-6 rounded-lg border flex flex-col items-center text-center space-y-2 ${comparison.match ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'}`}
                        >
                            {comparison.match ? (
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            ) : (
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                            )}
                            <h3
                                className={`text-sm font-black uppercase tracking-widest ${comparison.match ? 'text-emerald-500' : 'text-destructive'}`}
                            >
                                {comparison.match
                                    ? 'Diagnostic Match: Perfect'
                                    : 'Diagnostic Failure: Mismatch'}
                            </h3>
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                                Total restored records:{' '}
                                <span className="text-foreground">
                                    {restoredTransactions.length}
                                </span>
                            </p>

                            {!comparison.match && (
                                <ul className="mt-4 text-[10px] font-bold uppercase tracking-widest text-destructive/80 space-y-1">
                                    {comparison.differences.map(
                                        (diff: string, i: number): React.ReactElement => (
                                            <li key={i}>• {diff}</li>
                                        ),
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
