import type { IExportMetadata, IRetentionPolicy } from '../types/export-import.types';

export interface IExportFolderSummary {
    folderId: string;
    folderName: string; // e.g. "20260808" or "20260808_01"
    createdAt?: string;
    metadata?: IExportMetadata;
}

/**
 * ExportCleaner evaluates export folders against user retention policies
 * to determine which folders should be deleted during maintenance.
 */
export const ExportCleaner = {
    /**
     * Filters export folders and returns the array of folder IDs to be deleted based on retention policy.
     */
    evaluateRetentionPolicy: (
        folders: Array<IExportFolderSummary>,
        policy: IRetentionPolicy
    ): Array<string> => {
        if (!folders || folders.length === 0) return [];

        const now = Date.now();
        const toDeleteFolderIds = new Set<string>();

        // Sort folders newest to oldest
        const sortedFolders = [...folders].sort((a, b) => {
            const timeA = getFolderTimestamp(a);
            const timeB = getFolderTimestamp(b);
            return timeB - timeA;
        });

        // 1. Max Age Days Policy
        if (policy.maxAgeDays !== undefined && policy.maxAgeDays > 0) {
            const maxAgeMs = policy.maxAgeDays * 24 * 60 * 60 * 1000;
            const thresholdTime = now - maxAgeMs;

            for (const folder of sortedFolders) {
                if (getFolderTimestamp(folder) < thresholdTime) {
                    toDeleteFolderIds.add(folder.folderId);
                }
            }
        }

        // 2. Before Date Policy (ISO string YYYY-MM-DD)
        if (policy.beforeDate) {
            const beforeTime = new Date(policy.beforeDate).getTime();
            for (const folder of sortedFolders) {
                if (getFolderTimestamp(folder) < beforeTime) {
                    toDeleteFolderIds.add(folder.folderId);
                }
            }
        }

        // 3. Keep Latest Count Policy (e.g. keep latest N exports)
        if (policy.keepLatestCount !== undefined && policy.keepLatestCount >= 0) {
            const keepCount = policy.keepLatestCount;
            // Retain the first `keepCount` items in sorted (newest) order
            for (let i = keepCount; i < sortedFolders.length; i++) {
                const folderToDelete = sortedFolders[i];
                if (folderToDelete) {
                    toDeleteFolderIds.add(folderToDelete.folderId);
                }
            }
        }

        return Array.from(toDeleteFolderIds);
    }
};

/**
 * Parses timestamp from metadata createdAt or folderName (e.g. YYYYMMDD)
 */
function getFolderTimestamp(folder: IExportFolderSummary): number {
    if (folder.createdAt) {
        const time = new Date(folder.createdAt).getTime();
        if (!isNaN(time) && time > 0) return time;
    }

    if (folder.metadata?.createdAt) {
        const time = new Date(folder.metadata.createdAt).getTime();
        if (!isNaN(time) && time > 0) return time;
    }

    // Try parsing folderName "YYYYMMDD" or "YYYYMMDD_01"
    const nameMatch = folder.folderName.match(/^(\d{4})(\d{2})(\d{2})/);
    if (nameMatch) {
        const [, year, month, day] = nameMatch;
        const date = new Date(
            parseInt(year ?? '2000', 10),
            parseInt(month ?? '1', 10) - 1,
            parseInt(day ?? '1', 10)
        );
        return date.getTime();
    }

    return 0;
}
