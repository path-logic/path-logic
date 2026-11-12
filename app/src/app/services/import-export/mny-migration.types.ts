import type { IMnyHeader, IMnyParseResult } from '../../core/parsers/MNYParser';
import type { IAccountIntelligenceReport } from './account-augmentation.service';

/**
 * Stages of off-thread .mny database parsing and ingestion.
 */
export enum MnyParseStage {
    Inspecting = 'inspecting',
    VerifyingCredentials = 'verifying_credentials',
    DecryptingPages = 'decrypting_pages',
    ReadingCatalog = 'reading_catalog',
    ExtractingAccounts = 'extracting_accounts',
    ExtractingCategories = 'extracting_categories',
    ExtractingPayees = 'extracting_payees',
    ExtractingTransactions = 'extracting_transactions',
    AiReconciling = 'ai_reconciling',
    Complete = 'complete'
}

/**
 * Migration modes for Microsoft Money file ingestion.
 */
export enum MnyMigrationMode {
    MergeAndReconcile = 'merge',
    ReplaceWorkspace = 'replace',
    SingleAccount = 'single_account'
}

/**
 * Inbound messages sent from main thread to mny-import.worker.ts.
 */
export type MnyWorkerInboundMessage =
    | {
          type: 'inspect';
          buffer: ArrayBuffer;
          password?: string | undefined;
          username?: string | undefined;
      }
    | {
          type: 'parse';
          buffer: ArrayBuffer;
          password?: string | undefined;
          username?: string | undefined;
      }
    | {
          type: 'cancel';
      };

/**
 * Outbound messages sent from mny-import.worker.ts to main thread.
 */
export type MnyWorkerOutboundMessage =
    | {
          type: 'inspected';
          header: IMnyHeader;
          passwordRequired: boolean;
          isVerified: boolean;
          tableCount: number;
      }
    | {
          type: 'progress';
          stage: MnyParseStage;
          percent: number;
          currentTable?: string | undefined;
      }
    | {
          type: 'parse_complete';
          result: IMnyParseResult;
      }
    | {
          type: 'error';
          code: string;
          message: string;
          details?: unknown;
      };

/**
 * Fine-grained options selected by user in the migration wizard.
 */
export interface IMnyMigrationOptions {
    mode: MnyMigrationMode;
    targetAccountId?: string;
    selectedAccountIds: Array<number>;
    includeClosedAccounts: boolean;
    importDecryptedAccountNumbers: boolean;
    selectedCategoryIds: Array<number>;
    includeHiddenCategories?: boolean | undefined;
    selectedPayeeIds: Array<number>;
    selectedRecurringScheduleIds?: Array<number> | undefined;
    dateRange?: {
        from?: string;
        to?: string;
    };
    preserveClearedStatus: boolean;
    synthesizeOpeningBalances: boolean;
    aiEnhancePayees: boolean;
    aiEnhanceCategories: boolean;
}

/**
 * Nested hierarchical category node for UI presentation.
 */
export interface IMnyCategoryNode {
    id: number;
    name: string;
    fullName?: string | undefined;
    cleanedName?: string | undefined;
    level: number;
    parentCategoryId: number | null;
    group: 'Income' | 'Expense';
    hasChildren: boolean;
    childCount: number;
    isHidden?: boolean | undefined;
}

/**
 * Default options for MNY migration.
 */
export const DEFAULT_MNY_MIGRATION_OPTIONS: IMnyMigrationOptions = {
    mode: MnyMigrationMode.MergeAndReconcile,
    selectedAccountIds: [],
    includeClosedAccounts: false,
    importDecryptedAccountNumbers: true,
    selectedCategoryIds: [],
    includeHiddenCategories: false,
    selectedPayeeIds: [],
    selectedRecurringScheduleIds: [],
    preserveClearedStatus: true,
    synthesizeOpeningBalances: true,
    aiEnhancePayees: true,
    aiEnhanceCategories: true
};

/**
 * Penny-perfect verification audit summary returned upon migration completion.
 */
export interface IMnyAuditReport {
    accountsCreated: number;
    categoriesMapped: number;
    payeesEnriched: number;
    payeesDeduplicated?: number | undefined;
    ignoredNumericPayees?: number | undefined;
    transactionsCommitted: number;
    transactionsDeduplicated?: number | undefined;
    recurringSchedulesCreated?: number | undefined;
    splitsBalanced: number;
    pennyDiscrepancy: number;
    durationMs: number;
    aiIntelligenceReport?: IAccountIntelligenceReport | undefined;
}
