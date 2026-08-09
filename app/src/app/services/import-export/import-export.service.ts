import type { WritableSignal } from '@angular/core';
import { inject, Injectable, signal } from '@angular/core';
import type { ITransaction } from '../../core/domain/types';
import { TransactionStatus } from '../../core/domain/types';
import { generateImportHash } from '../../core/engine/hashing';
import {
    CorruptionDetector,
    createExportPackage,
    decryptAncillarySettings,
    decryptPayload,
    ExportCleaner,
    ExportConsolidator,
    type IAncillaryPayload,
    type IConsolidatedOutputPackage,
    type ICorruptionReport,
    type IExportFolderSummary,
    type IExportMetadata,
    type IImportOptions,
    type IRecoveryAction,
    type IRetentionPolicy
} from '../../core/export-import';
import { QIFParser } from '../../core/parsers/QIFParser';
import {
    createExportPackageFolder,
    deleteExportPackageFolder,
    downloadExportFileContent,
    listExportPackageFolders,
    listFilesInPackageFolder,
    uploadExportFileToFolder
} from '../../lib/storage/GoogleDriveAdapter';
import { AuthService } from '../auth/auth.service';
import { FeatureFlagService } from '../feature-flag/feature-flag.service';
import { LedgerStore } from '../ledger-store/ledger.store';
import { UserSettingsStore } from '../user-settings-store/user-settings.store';

@Injectable({ providedIn: 'root' })
export class ImportExportService {
    private readonly ledgerStore: LedgerStore = inject(LedgerStore);
    private readonly userSettingsStore: UserSettingsStore = inject(UserSettingsStore);
    private readonly featureFlagService: FeatureFlagService = inject(FeatureFlagService);
    private readonly authService: AuthService = inject(AuthService);

    readonly isExporting: WritableSignal<boolean> = signal<boolean>(false);
    readonly isImporting: WritableSignal<boolean> = signal<boolean>(false);
    readonly isScanning: WritableSignal<boolean> = signal<boolean>(false);

    private getAccessToken(): string {
        const token = this.authService.accessToken();
        if (!token) {
            throw new Error('Google Drive access token not available. Please sign in.');
        }
        return token;
    }

    /**
     * Exports current ledger data and ancillary settings to a new GDrive package folder.
     */
    async exportToGDrive(passphrase: string = 'path-logic-key'): Promise<{ folderName: string }> {
        const accessToken = this.getAccessToken();

        this.isExporting.set(true);

        try {
            const accounts = this.ledgerStore.accounts();
            const accountData = accounts.map(acc => ({
                account: acc,
                transactions: this.ledgerStore.transactions().filter(tx => tx.accountId === acc.id)
            }));

            const ancillaryData = {
                categories: this.ledgerStore.categories(),
                payees: this.ledgerStore.payees(),
                recurringSchedules: this.ledgerStore.schedules(),
                featureFlags: this.featureFlagService.flags(),
                userSettings: this.userSettingsStore.settings() as unknown as Record<
                    string,
                    unknown
                >
            };

            const pkg = await createExportPackage(accountData, ancillaryData, passphrase);

            // Generate YYYYMMDD folder name
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

            const folder = await createExportPackageFolder(accessToken, dateStr);

            for (const file of pkg.files) {
                await uploadExportFileToFolder(
                    accessToken,
                    folder.id,
                    file.filename,
                    file.mimeType,
                    file.encryptedContent
                );
            }

            return { folderName: folder.name };
        } finally {
            this.isExporting.set(false);
        }
    }

    /**
     * Scans GDrive appDataFolder for all available export packages and parses metadata.
     */
    async scanGDriveExports(): Promise<Array<IExportFolderSummary>> {
        const token = this.authService.accessToken();
        if (!token) return [];

        this.isScanning.set(true);

        try {
            const folders = await listExportPackageFolders(token);
            const result: Array<IExportFolderSummary> = [];

            for (const folder of folders) {
                const files = await listFilesInPackageFolder(token, folder.id);
                const metaFile = files.find(f => f.name === 'export_metadata.json');

                let metadata: IExportMetadata | undefined;
                if (metaFile) {
                    try {
                        const metaJson = await downloadExportFileContent(token, metaFile.id);
                        metadata = JSON.parse(metaJson) as IExportMetadata;
                    } catch {
                        // Ignore parse error
                    }
                }

                const folderSummary: IExportFolderSummary = {
                    folderId: folder.id,
                    folderName: folder.name
                };
                if (folder.modifiedTime) folderSummary.createdAt = folder.modifiedTime;
                if (metadata) folderSummary.metadata = metadata;

                result.push(folderSummary);
            }

            return result;
        } finally {
            this.isScanning.set(false);
        }
    }

    /**
     * Verifies binary checksums and parse integrity of a specific GDrive export folder.
     */
    async verifyExportFolder(
        folderId: string,
        passphrase: string = 'path-logic-key'
    ): Promise<{ metadata: IExportMetadata; report: ICorruptionReport }> {
        const accessToken = this.getAccessToken();

        const files = await listFilesInPackageFolder(accessToken, folderId);
        const metaFile = files.find(f => f.name === 'export_metadata.json');
        if (!metaFile) throw new Error('Missing export_metadata.json in package folder');

        const metaJson = await downloadExportFileContent(accessToken, metaFile.id);
        const metadata = JSON.parse(metaJson) as IExportMetadata;

        const downloadedFiles: Array<{
            filename: string;
            encryptedContent: string;
            decryptedContent?: string;
        }> = [];

        for (const file of files) {
            if (file.name === 'export_metadata.json') continue;

            const encryptedContent = await downloadExportFileContent(accessToken, file.id);
            let decryptedContent: string | undefined;

            try {
                decryptedContent = await decryptPayload(encryptedContent, passphrase);
            } catch {
                // Ignore decryption error for report
            }

            const item: {
                filename: string;
                encryptedContent: string;
                decryptedContent?: string;
            } = {
                filename: file.name,
                encryptedContent
            };
            if (decryptedContent !== undefined) {
                item.decryptedContent = decryptedContent;
            }

            downloadedFiles.push(item);
        }

        const report = await CorruptionDetector.verifyExportIntegrity(metadata, downloadedFiles);
        return { metadata, report };
    }

    /**
     * Executes granular package import into LedgerStore and UserSettingsStore.
     */
    async importGDriveExportPackage(
        folderId: string,
        options: IImportOptions,
        recoveryActions: Array<IRecoveryAction> = [],
        passphrase: string = 'path-logic-key'
    ): Promise<void> {
        const accessToken = this.getAccessToken();

        this.isImporting.set(true);

        try {
            const files = await listFilesInPackageFolder(accessToken, folderId);
            const metaFile = files.find(f => f.name === 'export_metadata.json');
            if (!metaFile) {
                throw new Error(
                    'Missing metadata file: export_metadata.json was not found in package folder.'
                );
            }

            const metaJson = await downloadExportFileContent(accessToken, metaFile.id);
            let metadata: IExportMetadata;
            try {
                metadata = JSON.parse(metaJson) as IExportMetadata;
            } catch {
                throw new Error(
                    'Corrupted metadata file: export_metadata.json contains invalid JSON data.'
                );
            }

            const recoveryMap = new Map<string, IRecoveryAction>();
            for (const act of recoveryActions) {
                recoveryMap.set(act.accountId, act);
            }

            // 1. Process Ancillary Data if selected
            if (metadata.ancillaryFile) {
                const ancFile = files.find(f => f.name === metadata.ancillaryFile.filename);
                if (ancFile) {
                    const encryptedText = await downloadExportFileContent(accessToken, ancFile.id);
                    const ancillaryPayload = await decryptAncillarySettings(
                        encryptedText,
                        passphrase
                    );

                    if (options.settings.featureFlags && ancillaryPayload.featureFlags) {
                        for (const [flag, val] of Object.entries(ancillaryPayload.featureFlags)) {
                            this.featureFlagService.toggle(flag, val);
                        }
                    }
                }
            }

            // 2. Process Account Purges if requested
            if (options.accountImportMode === 'overwrite_all') {
                for (const acc of this.ledgerStore.accounts()) {
                    await this.ledgerStore.purgeAccount(acc.id);
                }
            } else if (options.existingAccountIdsToDelete.length > 0) {
                for (const accId of options.existingAccountIdsToDelete) {
                    await this.ledgerStore.purgeAccount(accId);
                }
            }

            // 3. Process Account & QIF Imports
            const selectedSet = new Set(options.selectedAccountIdsToImport);
            const parser = new QIFParser();

            for (const accMeta of metadata.accounts || []) {
                if (!selectedSet.has(accMeta.id)) continue;

                const qifFile = files.find(f => f.name === accMeta.snakeCaseFilename);
                if (!qifFile) {
                    throw new Error(
                        `Missing account file: '${accMeta.snakeCaseFilename}' for account '${accMeta.name}' was not found in package folder.`
                    );
                }

                const encryptedText = await downloadExportFileContent(accessToken, qifFile.id);
                const decryptedQif = await decryptPayload(encryptedText, passphrase);
                const parseResult = parser.parse(decryptedQif);

                if (parseResult.errors && parseResult.errors.length > 0) {
                    const firstErr = parseResult.errors[0]?.message || 'Invalid QIF file format';
                    throw new Error(`QIF Parse Error in account '${accMeta.name}': ${firstErr}`);
                }

                // Check or create target account
                let targetAccount = this.ledgerStore.accounts().find(a => a.id === accMeta.id);
                if (!targetAccount) {
                    targetAccount = {
                        id: accMeta.id,
                        name: accMeta.name,
                        type: accMeta.type,
                        institutionName: 'Imported Institution',
                        clearedBalance: accMeta.balanceCents,
                        pendingBalance: accMeta.balanceCents,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        deletedAt: null
                    };
                    await this.ledgerStore.addAccount(targetAccount);
                }

                const importedTxs: Array<ITransaction> = [];

                for (const pTx of parseResult.transactions) {
                    const payeeObj = await this.ledgerStore.getOrCreatePayee(
                        pTx.payee || 'Imported Payee'
                    );

                    importedTxs.push({
                        id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        accountId: accMeta.id,
                        payeeId: payeeObj.id,
                        date: pTx.date,
                        payee: pTx.payee || 'Imported Payee',
                        memo: pTx.memo || '',
                        totalAmount: pTx.amount,
                        status: TransactionStatus.Cleared,
                        splits: pTx.splits.map((s, idx) => ({
                            id: `split-${idx}`,
                            categoryId: s.category || null,
                            memo: s.memo || '',
                            amount: s.amount
                        })),
                        checkNumber: pTx.checkNumber || null,
                        importHash: generateImportHash(pTx.date, pTx.amount, pTx.payee || ''),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                // Check for Corruption Recovery Adjustment
                const recovery = recoveryMap.get(accMeta.id);
                if (recovery && recovery.reconciliationAdjustmentCents !== 0) {
                    const recPayee = await this.ledgerStore.getOrCreatePayee(
                        'Reconciliation Adjustment (Import Recovery)'
                    );
                    const nowIso = new Date().toISOString();

                    importedTxs.push({
                        id: `recovery-adj-${Date.now()}`,
                        accountId: accMeta.id,
                        payeeId: recPayee.id,
                        date: nowIso.split('T')[0] ?? '2026-08-08',
                        payee: 'Reconciliation Adjustment (Import Recovery)',
                        memo:
                            recovery.reconciliationMemo ||
                            'Automated reconciliation balancing entry for dropped corrupted records',
                        totalAmount: recovery.reconciliationAdjustmentCents,
                        status: TransactionStatus.Reconciled,
                        splits: [
                            {
                                id: 'split-0',
                                categoryId: null,
                                amount: recovery.reconciliationAdjustmentCents,
                                memo: 'Recovery adjustment'
                            }
                        ],
                        checkNumber: null,
                        importHash: generateImportHash(
                            nowIso.split('T')[0] ?? '2026-08-08',
                            recovery.reconciliationAdjustmentCents,
                            'Reconciliation Adjustment'
                        ),
                        createdAt: nowIso,
                        updatedAt: nowIso
                    });
                }

                for (const tx of importedTxs) {
                    await this.ledgerStore.addTransaction(tx);
                }
            }
        } finally {
            this.isImporting.set(false);
        }
    }

    /**
     * Consolidates same-day exports on Google Drive.
     */
    async consolidateSameDayExports(
        targetDateStr: string,
        passphrase: string = 'path-logic-key'
    ): Promise<IConsolidatedOutputPackage> {
        const accessToken = this.getAccessToken();

        const allFolders = await listExportPackageFolders(accessToken);
        const matchingFolders = allFolders.filter(f => f.name.startsWith(targetDateStr));

        if (matchingFolders.length < 2) {
            throw new Error(
                `At least 2 exports on ${targetDateStr} are required for consolidation.`
            );
        }

        const packageContents = [];
        for (const folder of matchingFolders) {
            const files = await listFilesInPackageFolder(accessToken, folder.id);
            const metaFile = files.find(f => f.name === 'export_metadata.json');
            if (!metaFile) continue;

            const metaJson = await downloadExportFileContent(accessToken, metaFile.id);
            const metadata = JSON.parse(metaJson) as IExportMetadata;

            let ancillaryPayload: IAncillaryPayload = {
                categories: [],
                payees: [],
                recurringSchedules: [],
                featureFlags: {},
                userSettings: {}
            };
            if (metadata.ancillaryFile) {
                const ancFile = files.find(f => f.name === metadata.ancillaryFile.filename);
                if (ancFile) {
                    const encryptedAnc = await downloadExportFileContent(accessToken, ancFile.id);
                    ancillaryPayload = await decryptAncillarySettings(encryptedAnc, passphrase);
                }
            }

            const parser = new QIFParser();
            const accounts = [];

            for (const accMeta of metadata.accounts || []) {
                const qifFile = files.find(f => f.name === accMeta.snakeCaseFilename);
                if (!qifFile) continue;

                const encryptedText = await downloadExportFileContent(accessToken, qifFile.id);
                const decryptedQif = await decryptPayload(encryptedText, passphrase);
                const parseResult = parser.parse(decryptedQif);

                const txList: Array<ITransaction> = [];
                for (const pTx of parseResult.transactions) {
                    txList.push({
                        id: `tx-${Math.random()}`,
                        accountId: accMeta.id,
                        payeeId: 'imported-payee',
                        date: pTx.date,
                        payee: pTx.payee || 'Payee',
                        memo: pTx.memo || '',
                        totalAmount: pTx.amount,
                        status: TransactionStatus.Cleared,
                        splits: pTx.splits.map((s, idx) => ({
                            id: `split-${idx}`,
                            categoryId: s.category || null,
                            memo: s.memo || '',
                            amount: s.amount
                        })),
                        checkNumber: pTx.checkNumber || null,
                        importHash: generateImportHash(pTx.date, pTx.amount, pTx.payee || ''),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }

                accounts.push({
                    account: {
                        id: accMeta.id,
                        name: accMeta.name,
                        type: accMeta.type,
                        institutionName: 'Institution',
                        clearedBalance: accMeta.balanceCents,
                        pendingBalance: accMeta.balanceCents,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        deletedAt: null
                    },
                    transactions: txList
                });
            }

            packageContents.push({
                folderName: folder.name,
                metadata,
                accounts,
                ancillaryPayload
            });
        }

        const consolidated = ExportConsolidator.consolidateSameDayExports(
            packageContents,
            targetDateStr
        );

        const accountData = consolidated.accounts.map(a => ({
            account: a.account,
            transactions: a.transactions
        }));

        const newPkg = await createExportPackage(
            accountData,
            consolidated.ancillaryPayload,
            passphrase
        );

        const newFolder = await createExportPackageFolder(
            accessToken,
            `${targetDateStr}_consolidated`
        );
        for (const file of newPkg.files) {
            await uploadExportFileToFolder(
                accessToken,
                newFolder.id,
                file.filename,
                file.mimeType,
                file.encryptedContent
            );
        }

        return consolidated;
    }

    /**
     * Purges old exports based on retention policy.
     */
    async cleanupExportsByPolicy(policy: IRetentionPolicy): Promise<Array<string>> {
        const accessToken = this.getAccessToken();

        const folders = await this.scanGDriveExports();
        const folderIdsToDelete = ExportCleaner.evaluateRetentionPolicy(folders, policy);

        for (const folderId of folderIdsToDelete) {
            await deleteExportPackageFolder(accessToken, folderId);
        }

        return folderIdsToDelete;
    }

    /**
     * Deletes a specific export folder by folder ID.
     */
    async deleteExportFolder(folderId: string): Promise<void> {
        const accessToken = this.getAccessToken();
        await deleteExportPackageFolder(accessToken, folderId);
    }
}
