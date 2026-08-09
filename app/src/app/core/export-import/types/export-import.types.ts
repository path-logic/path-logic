import type {
    AccountType,
    Cents,
    ICategory,
    IPayee,
    IRecurringSchedule,
    ITransaction
} from '../../domain/types';

/**
 * Metadata descriptor for an export package stored in GDrive appDataFolder
 */
export interface IExportAccountMetadata {
    id: string;
    name: string;
    type: AccountType;
    snakeCaseFilename: string;
    transactionCount: number;
    balanceCents: Cents;
    sha256: string;
}

export interface IExportMetadata {
    exportId: string;
    createdAt: string; // ISO Date String
    appVersion: string;
    coreVersion: string;
    accounts: Array<IExportAccountMetadata>;
    ancillaryFile: {
        filename: string;
        sha256: string;
        algorithm: 'AES-GCM-256';
    };
    overallChecksum: string;
}

/**
 * Ancillary data structure (categories, payees, recurring schedules, feature flags, UI preferences)
 * STRICTLY EXCLUDES SENSITIVE API KEYS (e.g. Gemini / AI Key)
 */
export interface IAncillaryPayload {
    categories: Array<ICategory>;
    payees: Array<IPayee>;
    recurringSchedules: Array<IRecurringSchedule>;
    featureFlags: Record<string, boolean>;
    userSettings: {
        baseCurrency?: string;
        dateFormat?: string;
        theme?: string;
        [key: string]: unknown;
    };
}

export type SettingsImportMode = 'merge' | 'overwrite';
export type AccountImportMode = 'merge' | 'overwrite_all';

export interface ISettingsImportSelection {
    mode: SettingsImportMode;
    categories: boolean;
    payees: boolean;
    recurringSchedules: boolean;
    featureFlags: boolean;
    userSettings: boolean;
}

export interface IImportOptions {
    settings: ISettingsImportSelection;
    accountImportMode: AccountImportMode;
    selectedAccountIdsToImport: Array<string>;
    existingAccountIdsToDelete: Array<string>;
}

export interface ICorruptedTransaction {
    lineNumber?: number;
    rawLine?: string;
    reason: string;
    parsedPartial?: Partial<ITransaction>;
}

export interface ICorruptedAccountReport {
    accountId: string;
    accountName: string;
    filename: string;
    expectedBalanceCents: Cents;
    validTransactionsSumCents: Cents;
    discrepancyCents: Cents;
    corruptedTransactions: Array<ICorruptedTransaction>;
}

export interface ICorruptionReport {
    hasCorruption: boolean;
    invalidChecksumFiles: Array<string>;
    corruptedAccounts: Array<ICorruptedAccountReport>;
}

export interface IRecoveryAction {
    accountId: string;
    dropCorrupted: boolean;
    reconciliationAdjustmentCents: Cents;
    reconciliationMemo?: string;
}

export interface IConsolidationResult {
    consolidatedExportId: string;
    targetFolderName: string;
    mergedAccountCount: number;
    mergedTransactionCount: number;
    sourceFoldersCombined: Array<string>;
}

export interface IRetentionPolicy {
    maxAgeDays?: number;
    beforeDate?: string;
    keepLatestCount?: number;
}
