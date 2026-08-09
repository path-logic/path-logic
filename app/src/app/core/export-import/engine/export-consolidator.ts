import type {
    IAccount,
    ICategory,
    IPayee,
    IRecurringSchedule,
    ITransaction
} from '../../domain/types';
import { generateImportHash } from '../../engine/hashing';
import type { IAncillaryPayload, IExportMetadata } from '../types/export-import.types';

export interface IExportPackageContent {
    folderName: string;
    metadata: IExportMetadata;
    accounts: Array<{
        account: IAccount;
        transactions: Array<ITransaction>;
    }>;
    ancillaryPayload: IAncillaryPayload;
}

export interface IConsolidatedOutputPackage {
    targetFolderName: string;
    metadata: Partial<IExportMetadata>;
    accounts: Array<{
        account: IAccount;
        transactions: Array<ITransaction>;
    }>;
    ancillaryPayload: IAncillaryPayload;
    mergedAccountCount: number;
    mergedTransactionCount: number;
    sourceFoldersCombined: Array<string>;
}

/**
 * ExportConsolidator diffs and merges multiple exports created on the same day into a unified export package.
 * Latest export timestamp is assumed authoritative while non-duplicate historical records are preserved.
 */
export const ExportConsolidator = {
    /**
     * Consolidates multiple same-day export package contents into a single unified output package.
     */
    consolidateSameDayExports: (
        packages: Array<IExportPackageContent>,
        targetFolderName: string
    ): IConsolidatedOutputPackage => {
        if (!packages || packages.length === 0) {
            throw new Error('Cannot consolidate empty export package list');
        }

        // Sort chronologically by createdAt (oldest first, so newest overwrites in merge)
        const sortedPackages = [...packages].sort(
            (a, b) =>
                new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
        );

        const mergedAccountMap = new Map<string, IAccount>();
        const accountTxHashMap = new Map<string, Map<string, ITransaction>>();

        const categoryMap = new Map<string, ICategory>();
        const payeeMap = new Map<string, IPayee>();
        const scheduleMap = new Map<string, IRecurringSchedule>();
        let mergedFeatureFlags: Record<string, boolean> = {};
        let mergedUserSettings: Record<string, unknown> = {};

        for (const pkg of sortedPackages) {
            // Merge Ancillary Settings
            for (const cat of pkg.ancillaryPayload.categories || []) {
                categoryMap.set(cat.id, { ...cat });
            }
            for (const payee of pkg.ancillaryPayload.payees || []) {
                payeeMap.set(payee.id, { ...payee });
            }
            for (const sched of pkg.ancillaryPayload.recurringSchedules || []) {
                scheduleMap.set(sched.id, { ...sched });
            }
            mergedFeatureFlags = { ...mergedFeatureFlags, ...pkg.ancillaryPayload.featureFlags };
            mergedUserSettings = { ...mergedUserSettings, ...pkg.ancillaryPayload.userSettings };

            // Merge Accounts & Transactions
            for (const accObj of pkg.accounts) {
                const acc = accObj.account;
                mergedAccountMap.set(acc.id, { ...acc });

                if (!accountTxHashMap.has(acc.id)) {
                    accountTxHashMap.set(acc.id, new Map<string, ITransaction>());
                }

                let txMap = accountTxHashMap.get(acc.id);
                if (!txMap) {
                    txMap = new Map<string, ITransaction>();
                    accountTxHashMap.set(acc.id, txMap);
                }
                for (const tx of accObj.transactions) {
                    const hash = generateImportHash(tx.date, tx.totalAmount, tx.payee);
                    // Store transaction indexed by deterministic hash (newest overwrites)
                    txMap.set(hash, { ...tx });
                }
            }
        }

        const consolidatedAccounts: Array<{
            account: IAccount;
            transactions: Array<ITransaction>;
        }> = [];
        let totalTxCount = 0;

        for (const [accId, account] of mergedAccountMap.entries()) {
            const txMap = accountTxHashMap.get(accId);
            const txList = txMap ? Array.from(txMap.values()) : [];
            // Sort transactions by date
            txList.sort((a, b) => a.date.localeCompare(b.date));

            totalTxCount += txList.length;
            consolidatedAccounts.push({
                account,
                transactions: txList
            });
        }

        const consolidatedAncillary: IAncillaryPayload = {
            categories: Array.from(categoryMap.values()),
            payees: Array.from(payeeMap.values()),
            recurringSchedules: Array.from(scheduleMap.values()),
            featureFlags: mergedFeatureFlags,
            userSettings: mergedUserSettings
        };

        const latestPkg = sortedPackages[sortedPackages.length - 1];

        return {
            targetFolderName,
            metadata: {
                exportId: `consolidated-${Date.now()}`,
                createdAt: new Date().toISOString(),
                appVersion: latestPkg?.metadata.appVersion || '0.1.0',
                coreVersion: latestPkg?.metadata.coreVersion || '0.1.0'
            },
            accounts: consolidatedAccounts,
            ancillaryPayload: consolidatedAncillary,
            mergedAccountCount: consolidatedAccounts.length,
            mergedTransactionCount: totalTxCount,
            sourceFoldersCombined: sortedPackages.map(p => p.folderName)
        };
    }
};
