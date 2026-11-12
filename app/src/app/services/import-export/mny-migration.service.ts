import type { WritableSignal } from '@angular/core';
import { Injectable, NgZone, inject, signal } from '@angular/core';
import type {
    AccountType,
    IAccount,
    ICategory,
    IParsedSplit,
    IPayee,
    IRecurringSchedule,
    ISODateString,
    ISplit,
    ITransaction
} from '../../core/domain/types';
import { QifClearedStatus, TransactionStatus } from '../../core/domain/types';
import { generateImportHash } from '../../core/engine/hashing';
import {
    MNYParser,
    type IMnyAccount,
    type IMnyCategory,
    type IMnyHeader,
    type IMnyParseResult,
    type IMnyPayee,
    type IMnyRecurringSchedule
} from '../../core/parsers/MNYParser';
import {
    getAllAccounts,
    getAllCategories,
    getAllPayees,
    getAllRecurringSchedules,
    getAllTransactions,
    getAllUserSettings,
    getDb,
    initDatabase,
    insertAccount,
    insertCategory,
    insertPayee,
    insertRecurringSchedule,
    insertTransactions,
    resetDatabase,
    setUserSetting,
    updateAccount
} from '../../lib/storage/SQLiteAdapter';
import { LedgerStore } from '../ledger-store/ledger.store';
import { AccountAugmentationService } from './account-augmentation.service';
import { AiMnyEnhancerService } from './ai-mny-enhancer.service';
import {
    DEFAULT_MNY_MIGRATION_OPTIONS,
    MnyMigrationMode,
    MnyParseStage,
    type IMnyAuditReport,
    type IMnyMigrationOptions,
    type MnyWorkerInboundMessage,
    type MnyWorkerOutboundMessage
} from './mny-migration.types';

export type MnyWizardStep = 'drop' | 'unlock' | 'mode' | 'select' | 'migrating' | 'report';

@Injectable({ providedIn: 'root' })
export class MnyMigrationService {
    private readonly zone = inject(NgZone);
    private readonly ledgerStore = inject(LedgerStore);
    private readonly aiEnhancer = inject(AiMnyEnhancerService, { optional: true });
    private readonly augmentationService = inject(AccountAugmentationService, { optional: true });

    private worker: Worker | null = null;
    private rawBuffer: ArrayBuffer | null = null;

    // --- Reactive Signals ---
    readonly isOpen: WritableSignal<boolean> = signal<boolean>(false);
    readonly step: WritableSignal<MnyWizardStep> = signal<MnyWizardStep>('drop');
    readonly file: WritableSignal<File | null> = signal<File | null>(null);
    readonly header: WritableSignal<IMnyHeader | null> = signal<IMnyHeader | null>(null);
    readonly passwordRequired: WritableSignal<boolean> = signal<boolean>(false);
    readonly credentialsVerified: WritableSignal<boolean> = signal<boolean>(false);
    readonly tableCount: WritableSignal<number> = signal<number>(0);
    readonly parseResult: WritableSignal<IMnyParseResult | null> = signal<IMnyParseResult | null>(
        null
    );
    readonly options: WritableSignal<IMnyMigrationOptions> = signal<IMnyMigrationOptions>({
        ...DEFAULT_MNY_MIGRATION_OPTIONS
    });
    readonly progressStage: WritableSignal<MnyParseStage> = signal<MnyParseStage>(
        MnyParseStage.Inspecting
    );
    readonly progressPercent: WritableSignal<number> = signal<number>(0);
    readonly currentTable: WritableSignal<string | null> = signal<string | null>(null);
    readonly auditReport: WritableSignal<IMnyAuditReport | null> = signal<IMnyAuditReport | null>(
        null
    );
    readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);

    /**
     * Opens the migration dialog.
     */
    open(): void {
        this.reset();
        this.isOpen.set(true);
    }

    /**
     * Closes the migration dialog and terminates worker.
     */
    close(): void {
        this.terminateWorker();
        this.reset();
        this.isOpen.set(false);
    }

    /**
     * Resets the migration state.
     */
    reset(): void {
        this.terminateWorker();
        this.rawBuffer = null;
        this.step.set('drop');
        this.file.set(null);
        this.header.set(null);
        this.passwordRequired.set(false);
        this.credentialsVerified.set(false);
        this.tableCount.set(0);
        this.parseResult.set(null);
        this.options.set({ ...DEFAULT_MNY_MIGRATION_OPTIONS });
        this.progressStage.set(MnyParseStage.Inspecting);
        this.progressPercent.set(0);
        this.currentTable.set(null);
        this.auditReport.set(null);
        this.errorMessage.set(null);
    }

    /**
     * Inspects a newly selected .mny file.
     */
    async inspectFile(file: File, password: string = '', username?: string): Promise<void> {
        this.file.set(file);
        this.errorMessage.set(null);
        this.progressPercent.set(10);
        this.progressStage.set(MnyParseStage.Inspecting);

        const buffer: ArrayBuffer = await file.arrayBuffer();
        this.rawBuffer = buffer;

        await this.inspectBuffer(buffer, password, username);
    }

    /**
     * Inspects an ArrayBuffer directly.
     */
    async inspectBuffer(
        buffer: ArrayBuffer,
        password: string = '',
        username?: string
    ): Promise<void> {
        this.rawBuffer = buffer;
        const copyForWorker: ArrayBuffer = buffer.slice(0);

        try {
            const result = await this.executeWorkerInspect(copyForWorker, password, username);
            this.header.set(result.header);
            this.passwordRequired.set(result.passwordRequired);
            this.credentialsVerified.set(result.isVerified);
            this.tableCount.set(result.tableCount);

            if (result.passwordRequired && !result.isVerified) {
                this.step.set('unlock');
            } else {
                await this.runFullParse(buffer, password, username);
                this.step.set('mode');
            }
        } catch (err: unknown) {
            if (this.passwordRequired() && !this.credentialsVerified()) {
                this.step.set('unlock');
            } else {
                this.errorMessage.set(err instanceof Error ? err.message : 'Inspection failed');
                this.step.set('drop');
            }
        }
    }

    /**
     * Verifies master credentials against the loaded file buffer.
     */
    async verifyCredentials(password: string, username?: string): Promise<boolean> {
        if (!this.rawBuffer) {
            this.errorMessage.set('No file loaded to verify credentials');
            return false;
        }

        const copyForWorker: ArrayBuffer = this.rawBuffer.slice(0);
        try {
            const result = await this.executeWorkerInspect(copyForWorker, password, username);
            this.header.set(result.header);
            this.credentialsVerified.set(result.isVerified);
            this.tableCount.set(result.tableCount);

            if (result.isVerified) {
                this.errorMessage.set(null);
                await this.runFullParse(this.rawBuffer, password, username);
                this.step.set('mode');
                return true;
            } else {
                this.errorMessage.set('Incorrect password. Please re-enter.');
                return false;
            }
        } catch (err: unknown) {
            this.errorMessage.set(
                err instanceof Error ? err.message : 'Password verification error'
            );
            return false;
        }
    }

    /**
     * Executes the full parse across all tables.
     */
    async runFullParse(
        buffer: ArrayBuffer,
        password: string = '',
        username?: string
    ): Promise<IMnyParseResult> {
        this.progressStage.set(MnyParseStage.DecryptingPages);
        this.progressPercent.set(20);

        const copyForWorker: ArrayBuffer = buffer.slice(0);
        const result: IMnyParseResult = await this.executeWorkerParse(
            copyForWorker,
            password,
            username
        );

        if (result.errors.some(e => e.code === 'INVALID_PASSWORD')) {
            this.passwordRequired.set(true);
            this.credentialsVerified.set(false);
            this.step.set('unlock');
            this.errorMessage.set('Password required to decrypt Microsoft Money file.');
            throw new Error('Password required to decrypt Microsoft Money file.');
        }

        this.parseResult.set(result);

        // Precompute AI clean names for Payees & Categories if enhancer available
        if (this.aiEnhancer) {
            this.progressStage.set(MnyParseStage.AiReconciling);
            this.currentTable.set('AI Reconciling Payees, Categories & Account Health...');
            this.progressPercent.set(95);
            await new Promise(resolve => setTimeout(resolve, 40));
            await this.aiEnhancer.enhanceAll(result.payees, result.categories, result.accounts);
        }

        const includeClosed = this.options().includeClosedAccounts;
        const allAccountIds: Array<number> = result.accounts
            .filter((a: IMnyAccount): boolean => includeClosed || !a.isClosed)
            .map((a: IMnyAccount): number => a.mnyAccountId);
        const allCategoryIds: Array<number> = result.categories
            .filter(
                (c: IMnyCategory): boolean =>
                    !c.isHidden &&
                    !(
                        c.parentCategoryId === null &&
                        (c.name.toUpperCase() === 'INCOME' ||
                            c.name.toUpperCase() === 'EXPENSE' ||
                            c.mnyCategoryId === 130 ||
                            c.mnyCategoryId === 131)
                    )
            )
            .map((c: IMnyCategory): number => c.mnyCategoryId);
        const allPayeeIds: Array<number> =
            this.aiEnhancer && this.aiEnhancer.reconciledPayeeGroups().length > 0
                ? this.aiEnhancer.reconciledPayeeGroups().flatMap(g => g.mergedPayeeIds)
                : result.payees.map((p: IMnyPayee): number => p.mnyPayeeId);
        const allRecurringScheduleIds: Array<number> = (result.recurringSchedules ?? []).map(
            (s: IMnyRecurringSchedule): number => s.mnyBillHeadId
        );

        this.options.update(
            (opt: IMnyMigrationOptions): IMnyMigrationOptions => ({
                ...opt,
                selectedAccountIds: allAccountIds,
                selectedCategoryIds: allCategoryIds,
                selectedPayeeIds: allPayeeIds,
                selectedRecurringScheduleIds: allRecurringScheduleIds
            })
        );

        return result;
    }

    /**
     * Executes the complete migration transaction into SQLite.
     */
    async executeMigration(): Promise<IMnyAuditReport> {
        const result: IMnyParseResult | null = this.parseResult();
        if (!result) {
            throw new Error('No parsed data available to migrate');
        }

        this.step.set('migrating');
        this.progressPercent.set(5);
        this.progressStage.set(MnyParseStage.ExtractingAccounts);
        this.currentTable.set('Initializing SQLite Database...');
        this.errorMessage.set(null);

        // Yield to allow the browser to transition the view and display spinners immediately
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const startTime: number = performance.now();
            const currentOptions: IMnyMigrationOptions = this.options();
            const now: ISODateString = new Date().toISOString() as ISODateString;

            // Step 1: Ensure SQLite database is initialized, or clean slate if 'replace' mode selected
            if (currentOptions.mode === MnyMigrationMode.ReplaceWorkspace) {
                this.currentTable.set('Resetting Workspace...');
                let preservedSettings: Record<string, string> = {};
                try {
                    preservedSettings = getAllUserSettings();
                } catch {
                    // Ignore if DB was not initialized before reset
                }
                resetDatabase();
                await initDatabase();
                for (const [key, value] of Object.entries(preservedSettings)) {
                    if (key !== 'primary_account_id') {
                        try {
                            setUserSetting(key, value);
                        } catch {
                            // Ignore individual setting restore failure
                        }
                    }
                }
            } else if (!getDb()) {
                this.currentTable.set('Initializing Database...');
                await initDatabase();
            }

            // Step 2: Ingest Accounts
            this.progressPercent.set(15);
            this.progressStage.set(MnyParseStage.ExtractingAccounts);
            this.currentTable.set('Accounts');
            await new Promise(resolve => setTimeout(resolve, 120));

            const selectedAcctIdSet: Set<number> = new Set<number>(
                currentOptions.selectedAccountIds
            );
            const accountMap: Map<number, IAccount> = new Map<number, IAccount>();
            let existingAccounts: Array<IAccount> = [];
            try {
                existingAccounts = getAllAccounts();
            } catch (err) {
                console.warn('Could not read existing accounts from SQLite:', err);
            }
            const existingAcctByName: Map<string, IAccount> = new Map<string, IAccount>(
                existingAccounts
                    .filter((a: IAccount) => Boolean(a?.name))
                    .map((a: IAccount): [string, IAccount] => [a.name.toLowerCase(), a])
            );

            const dbInstance = getDb();
            const hasRunFn = Boolean(dbInstance && typeof dbInstance.run === 'function');
            if (hasRunFn) {
                dbInstance?.run('BEGIN TRANSACTION');
            }

            let accountsCreated: number = 0;
            try {
                for (const mnyAcct of result.accounts) {
                    if (!selectedAcctIdSet.has(mnyAcct.mnyAccountId)) continue;
                    if (!currentOptions.includeClosedAccounts && mnyAcct.isClosed) continue;

                    let targetAcct: IAccount | undefined = existingAcctByName.get(
                        mnyAcct.name.toLowerCase()
                    );
                    if (!targetAcct) {
                        const resolvedAccountType: AccountType =
                            this.aiEnhancer?.classifyAccountType(mnyAcct).accountType ??
                            mnyAcct.mappedType;
                        const newAcct: IAccount = {
                            id: `account-mny-${mnyAcct.mnyAccountId}-${Date.now()}`,
                            name: mnyAcct.name,
                            type: resolvedAccountType,
                            institutionName: mnyAcct.institutionName || 'Microsoft Money Import',
                            clearedBalance: mnyAcct.openingBalance,
                            pendingBalance: mnyAcct.openingBalance,
                            isActive: !mnyAcct.isClosed,
                            createdAt: now,
                            updatedAt: now,
                            deletedAt: null,
                            accountNumber: mnyAcct.accountNumber ?? null,
                            abbreviation: mnyAcct.abbreviation ?? null,
                            openingBalance: mnyAcct.openingBalance,
                            openingDate: mnyAcct.openingDate ?? null,
                            notes: mnyAcct.notes ?? null,
                            isFavorite: mnyAcct.isFavorite,
                            isTaxRelated: mnyAcct.isTaxRelated ?? false,
                            ...(mnyAcct.creditCardDetails
                                ? { creditCardDetails: mnyAcct.creditCardDetails }
                                : {}),
                            ...(mnyAcct.loanDetails ? { loanDetails: mnyAcct.loanDetails } : {})
                        };
                        insertAccount(newAcct);
                        targetAcct = newAcct;
                        accountsCreated++;
                    }
                    accountMap.set(mnyAcct.mnyAccountId, targetAcct);
                }
                if (hasRunFn) {
                    dbInstance?.run('COMMIT');
                }
            } catch (acctErr) {
                if (hasRunFn) {
                    dbInstance?.run('ROLLBACK');
                }
                throw acctErr;
            }

            // Step 3: Ingest Categories
            this.progressPercent.set(35);
            this.progressStage.set(MnyParseStage.ExtractingCategories);
            this.currentTable.set('Categories');
            await new Promise(resolve => setTimeout(resolve, 120));

            const selectedCatIdSet: Set<number> = new Set<number>(
                currentOptions.selectedCategoryIds
            );
            const rootContainerIds: Set<number> = new Set<number>([130, 131]);
            for (const c of result.categories) {
                if (
                    c.parentCategoryId === null &&
                    (c.name.toUpperCase() === 'INCOME' || c.name.toUpperCase() === 'EXPENSE')
                ) {
                    rootContainerIds.add(c.mnyCategoryId);
                }
            }

            const categoryMapByName: Map<string, ICategory> = new Map<string, ICategory>();
            const categoryMapByParentAndName: Map<string, ICategory> = new Map<string, ICategory>();
            const mnyCatIdToNewId: Map<number, string> = new Map<number, string>();
            const existingCategories: Array<ICategory> = getAllCategories();
            for (const cat of existingCategories) {
                categoryMapByName.set(cat.name.toLowerCase(), cat);
                categoryMapByParentAndName.set(
                    `${cat.parentId ?? 'root'}::${cat.name.toLowerCase()}`,
                    cat
                );
            }

            const sortedMnyCategories: Array<IMnyCategory> = [...result.categories].sort(
                (a: IMnyCategory, b: IMnyCategory): number => (a.level ?? 0) - (b.level ?? 0)
            );

            if (hasRunFn) {
                dbInstance?.run('BEGIN TRANSACTION');
            }

            let categoriesMapped: number = 0;
            try {
                for (const mnyCat of sortedMnyCategories) {
                    if (rootContainerIds.has(mnyCat.mnyCategoryId)) continue;
                    if (!selectedCatIdSet.has(mnyCat.mnyCategoryId)) continue;
                    if (mnyCat.isHidden && !currentOptions.includeHiddenCategories) continue;

                    const categoryName: string =
                        currentOptions.aiEnhanceCategories && this.aiEnhancer
                            ? this.aiEnhancer.getEnhancedCategoryName(mnyCat.name)
                            : mnyCat.name;

                    const parentId: string | null =
                        mnyCat.parentCategoryId && !rootContainerIds.has(mnyCat.parentCategoryId)
                            ? (mnyCatIdToNewId.get(mnyCat.parentCategoryId) ?? null)
                            : null;

                    const parentScopedKey: string = `${parentId ?? 'root'}::${categoryName.toLowerCase()}`;
                    const rawParentScopedKey: string = `${parentId ?? 'root'}::${mnyCat.name.toLowerCase()}`;

                    const existing: ICategory | undefined =
                        categoryMapByParentAndName.get(parentScopedKey) ??
                        categoryMapByParentAndName.get(rawParentScopedKey);

                    if (!existing) {
                        const newCat: ICategory = {
                            id: `category-mny-${mnyCat.mnyCategoryId}-${Date.now()}`,
                            parentId,
                            name: categoryName,
                            description: null,
                            isActive: !mnyCat.isHidden,
                            createdAt: now,
                            updatedAt: now
                        };
                        insertCategory(newCat);
                        categoryMapByParentAndName.set(parentScopedKey, newCat);
                        categoryMapByParentAndName.set(rawParentScopedKey, newCat);
                        if (
                            !categoryMapByName.has(categoryName.toLowerCase()) ||
                            parentId === null
                        ) {
                            categoryMapByName.set(categoryName.toLowerCase(), newCat);
                        }
                        if (
                            !categoryMapByName.has(mnyCat.name.toLowerCase()) ||
                            parentId === null
                        ) {
                            categoryMapByName.set(mnyCat.name.toLowerCase(), newCat);
                        }
                        if (mnyCat.fullName) {
                            categoryMapByName.set(mnyCat.fullName.toLowerCase(), newCat);
                        }
                        mnyCatIdToNewId.set(mnyCat.mnyCategoryId, newCat.id);
                        categoriesMapped++;
                    } else {
                        mnyCatIdToNewId.set(mnyCat.mnyCategoryId, existing.id);
                    }
                }
                if (hasRunFn) {
                    dbInstance?.run('COMMIT');
                }
            } catch (catErr) {
                if (hasRunFn) {
                    dbInstance?.run('ROLLBACK');
                }
                throw catErr;
            }

            // Step 4: Ingest Payees
            this.progressPercent.set(55);
            this.progressStage.set(MnyParseStage.ExtractingPayees);
            this.currentTable.set(
                currentOptions.aiEnhancePayees
                    ? 'AI Reconciling & Deduplicating Payees...'
                    : 'Payees'
            );
            await new Promise(resolve => setTimeout(resolve, 150));

            if (currentOptions.aiEnhancePayees && this.aiEnhancer) {
                await this.aiEnhancer.enhanceAll(result.payees, result.categories, result.accounts);
            }

            const selectedPayeeIdSet: Set<number> = new Set<number>(
                currentOptions.selectedPayeeIds
            );
            const payeeMapByName: Map<string, IPayee> = new Map<string, IPayee>();
            const existingPayees: Array<IPayee> = getAllPayees();
            for (const p of existingPayees) {
                payeeMapByName.set(p.name.toLowerCase(), p);
            }

            if (hasRunFn) {
                dbInstance?.run('BEGIN TRANSACTION');
            }

            let payeesEnriched: number = 0;
            let payeesDeduplicated: number = 0;
            try {
                const parentIdsReferenced = new Set<number>(
                    result.payees
                        .map(p => p.parentPayeeId)
                        .filter((pid): pid is number => pid !== null && pid !== undefined)
                );

                for (const mnyPayee of result.payees) {
                    if (!selectedPayeeIdSet.has(mnyPayee.mnyPayeeId)) continue;
                    // Skip unreferenced hidden orphan payees with zero transactions
                    if (
                        mnyPayee.isHidden === true &&
                        !mnyPayee.parentPayeeId &&
                        (mnyPayee.transactionCount ?? 0) === 0 &&
                        (mnyPayee.accountIds?.length ?? 0) === 0 &&
                        !parentIdsReferenced.has(mnyPayee.mnyPayeeId)
                    ) {
                        continue;
                    }
                    if (
                        currentOptions.aiEnhancePayees &&
                        this.aiEnhancer?.isNumericOrJunkPayee(mnyPayee.name) &&
                        !mnyPayee.parentPayeeId
                    ) {
                        continue;
                    }

                    const payeeName: string =
                        currentOptions.aiEnhancePayees && this.aiEnhancer
                            ? this.aiEnhancer.getEnhancedPayeeName(mnyPayee.mnyPayeeId) ||
                              this.aiEnhancer.getEnhancedPayeeName(mnyPayee.name) ||
                              mnyPayee.name
                            : mnyPayee.name;

                    if (
                        currentOptions.aiEnhancePayees &&
                        this.aiEnhancer?.isNumericOrJunkPayee(payeeName)
                    ) {
                        continue;
                    }

                    const existing: IPayee | undefined =
                        payeeMapByName.get(payeeName.toLowerCase()) ??
                        payeeMapByName.get(mnyPayee.name.toLowerCase());

                    if (!existing) {
                        const newPayee: IPayee = {
                            id: `payee-mny-${mnyPayee.mnyPayeeId}-${Date.now()}`,
                            name: payeeName,
                            address: mnyPayee.address ?? null,
                            city: mnyPayee.city ?? null,
                            state: mnyPayee.state ?? null,
                            zipCode: mnyPayee.zipCode ?? null,
                            latitude: null,
                            longitude: null,
                            website: null,
                            phone: mnyPayee.phone ?? null,
                            notes: mnyPayee.notes ?? null,
                            defaultCategoryId: null,
                            createdAt: now,
                            updatedAt: now
                        };
                        insertPayee(newPayee);
                        payeeMapByName.set(payeeName.toLowerCase(), newPayee);
                        payeeMapByName.set(mnyPayee.name.toLowerCase(), newPayee);
                        payeesEnriched++;
                    } else {
                        payeeMapByName.set(mnyPayee.name.toLowerCase(), existing);
                        payeesDeduplicated++;
                    }
                }
                if (hasRunFn) {
                    dbInstance?.run('COMMIT');
                }
            } catch (payeeErr) {
                if (hasRunFn) {
                    dbInstance?.run('ROLLBACK');
                }
                throw payeeErr;
            }

            // Step 5: Ingest Transactions & Splits
            this.progressPercent.set(75);
            this.progressStage.set(MnyParseStage.ExtractingTransactions);
            this.currentTable.set(
                currentOptions.mode === MnyMigrationMode.MergeAndReconcile
                    ? 'Merging & Reconciling Transactions & Splits...'
                    : 'Transactions & Splits'
            );
            await new Promise(resolve => setTimeout(resolve, 150));

            const txsToCommit: Array<ITransaction> = new Array<ITransaction>();
            const existingTxs: Array<ITransaction> = getAllTransactions();
            const existingHashes: Set<string> = new Set<string>(
                existingTxs.map((t: ITransaction): string => t.importHash).filter(Boolean)
            );

            let totalSplitsCount: number = 0;
            let pennyDiscrepancy: number = 0;
            let transactionsDeduplicated: number = 0;

            for (const mnyTx of result.transactions) {
                const mappedAcct: IAccount | undefined = accountMap.get(mnyTx.mnyAccountId);
                if (!mappedAcct) continue;

                // Date filtering
                if (currentOptions.dateRange?.from && mnyTx.date < currentOptions.dateRange.from) {
                    continue;
                }
                if (currentOptions.dateRange?.to && mnyTx.date > currentOptions.dateRange.to) {
                    continue;
                }

                // Deduplication in merge mode
                const hash: string =
                    mnyTx.importHash ?? generateImportHash(mnyTx.date, mnyTx.amount, mnyTx.payee);
                if (
                    currentOptions.mode === MnyMigrationMode.MergeAndReconcile &&
                    existingHashes.has(hash)
                ) {
                    transactionsDeduplicated++;
                    continue;
                }

                const effectivePayeeName: string =
                    currentOptions.aiEnhancePayees && this.aiEnhancer
                        ? this.aiEnhancer.getEnhancedPayeeName(mnyTx.payee)
                        : mnyTx.payee;

                const payeeEntity: IPayee | undefined =
                    payeeMapByName.get(effectivePayeeName.toLowerCase()) ??
                    payeeMapByName.get(mnyTx.payee.toLowerCase());

                const payeeId: string = payeeEntity?.id ?? `payee-adhoc-${mnyTx.mnyTransactionId}`;
                const txId: string = `tx-mny-${mnyTx.mnyTransactionId}`;

                // Reconstruct splits and verify Sum(splits) === TotalAmount
                const splits: Array<ISplit> = (mnyTx.splits ?? []).map(
                    (s: IParsedSplit, idx: number): ISplit => {
                        const directCatId: string | undefined =
                            s.mnyCategoryId !== null && s.mnyCategoryId !== undefined
                                ? mnyCatIdToNewId.get(s.mnyCategoryId)
                                : undefined;

                        const effectiveCatName: string =
                            s.category && currentOptions.aiEnhanceCategories && this.aiEnhancer
                                ? this.aiEnhancer.getEnhancedCategoryName(s.category)
                                : (s.category ?? '');

                        const catEntity: ICategory | undefined = effectiveCatName
                            ? (categoryMapByName.get(effectiveCatName.toLowerCase()) ??
                              (s.category
                                  ? categoryMapByName.get(s.category.toLowerCase())
                                  : undefined))
                            : undefined;

                        return {
                            id: `split-${txId}-${idx}`,
                            categoryId: directCatId ?? catEntity?.id ?? null,
                            memo: s.memo ?? '',
                            amount: s.amount
                        };
                    }
                );

                totalSplitsCount += splits.length;
                const splitSum: number = splits.reduce(
                    (acc: number, sp: ISplit): number => acc + sp.amount,
                    0
                );
                if (splitSum !== mnyTx.amount) {
                    pennyDiscrepancy += Math.abs(splitSum - mnyTx.amount);
                }

                const linkedMnyAccount: IMnyAccount | undefined =
                    mnyTx.linkedMnyAccountId !== null && mnyTx.linkedMnyAccountId !== undefined
                        ? result.accounts.find(
                              (a: IMnyAccount): boolean =>
                                  a.mnyAccountId === mnyTx.linkedMnyAccountId
                          )
                        : undefined;

                const resolvedPayee: string = payeeEntity?.name ?? effectivePayeeName;
                let resolvedMemo: string = mnyTx.memo ?? '';
                if (
                    linkedMnyAccount &&
                    !resolvedPayee.toLowerCase().includes(linkedMnyAccount.name.toLowerCase()) &&
                    !resolvedMemo.toLowerCase().includes(linkedMnyAccount.name.toLowerCase())
                ) {
                    resolvedMemo = resolvedMemo
                        ? `${resolvedMemo} [${linkedMnyAccount.name}]`
                        : `[${linkedMnyAccount.name}]`;
                }

                const resolvedStatus: TransactionStatus = currentOptions.preserveClearedStatus
                    ? mnyTx.clearedStatus === QifClearedStatus.Reconciled
                        ? TransactionStatus.Reconciled
                        : TransactionStatus.Cleared
                    : TransactionStatus.Pending;

                const tx: ITransaction = {
                    id: txId,
                    accountId: mappedAcct.id,
                    payeeId,
                    payee: resolvedPayee,
                    date: mnyTx.date as ISODateString,
                    memo: resolvedMemo,
                    totalAmount: mnyTx.amount,
                    status: resolvedStatus,
                    splits,
                    checkNumber: mnyTx.checkNumber,
                    importHash: hash,
                    createdAt: now,
                    updatedAt: now
                };

                txsToCommit.push(tx);
            }

            this.progressPercent.set(88);
            this.currentTable.set('Writing Ledger to SQLite...');
            await new Promise(resolve => setTimeout(resolve, 20));

            // Commit batch transactions to SQLite
            if (txsToCommit.length > 0) {
                insertTransactions(txsToCommit);
            }

            // Step 5b: Ingest Recurring Schedules (MS Money BILL table)
            let recurringSchedulesCreated: number = 0;
            const parsedRecurring: Array<IMnyRecurringSchedule> = result.recurringSchedules ?? [];
            if (parsedRecurring.length > 0) {
                this.currentTable.set('Importing Recurring Bills & Deposits...');
                const selectedScheduleIdSet: Set<number> | null =
                    currentOptions.selectedRecurringScheduleIds !== undefined
                        ? new Set<number>(currentOptions.selectedRecurringScheduleIds)
                        : null;

                let existingSchedules: Array<IRecurringSchedule> = [];
                try {
                    existingSchedules = getAllRecurringSchedules();
                } catch {
                    existingSchedules = [];
                }
                const existingScheduleKeys: Set<string> = new Set<string>(
                    existingSchedules.map(
                        (s: IRecurringSchedule): string =>
                            `${s.accountId}::${s.payee.toLowerCase()}::${s.amount}::${s.frequency}`
                    )
                );

                for (const sched of parsedRecurring) {
                    if (selectedScheduleIdSet && !selectedScheduleIdSet.has(sched.mnyBillHeadId)) {
                        continue;
                    }
                    const mappedAcct: IAccount | undefined = accountMap.get(sched.mnyAccountId);
                    if (!mappedAcct) continue;

                    const effectivePayee: string =
                        currentOptions.aiEnhancePayees && this.aiEnhancer
                            ? this.aiEnhancer.getEnhancedPayeeName(sched.payee) || sched.payee
                            : sched.payee;

                    const payeeEntity: IPayee | undefined =
                        payeeMapByName.get(effectivePayee.toLowerCase()) ??
                        payeeMapByName.get(sched.payee.toLowerCase());
                    const resolvedPayee: string = payeeEntity?.name ?? effectivePayee;

                    const dedupeKey: string = `${mappedAcct.id}::${resolvedPayee.toLowerCase()}::${sched.amount}::${sched.frequency}`;
                    if (
                        currentOptions.mode === MnyMigrationMode.MergeAndReconcile &&
                        existingScheduleKeys.has(dedupeKey)
                    ) {
                        continue;
                    }

                    const scheduleId: string = `schedule-mny-${sched.mnyBillHeadId}-${Date.now()}`;
                    const scheduleSplits: Array<ISplit> = (sched.splits ?? []).map(
                        (s: IParsedSplit, idx: number): ISplit => {
                            const directCatId: string | undefined =
                                s.mnyCategoryId !== null && s.mnyCategoryId !== undefined
                                    ? mnyCatIdToNewId.get(s.mnyCategoryId)
                                    : undefined;
                            const catEntity: ICategory | undefined = s.category
                                ? categoryMapByName.get(s.category.toLowerCase())
                                : undefined;
                            return {
                                id: `split-${scheduleId}-${idx}`,
                                categoryId: directCatId ?? catEntity?.id ?? null,
                                memo: s.memo ?? '',
                                amount: s.amount
                            };
                        }
                    );

                    const newSchedule: IRecurringSchedule = {
                        id: scheduleId,
                        accountId: mappedAcct.id,
                        payee: resolvedPayee,
                        amount: sched.amount,
                        type: sched.type,
                        frequency: sched.frequency,
                        paymentMethod: sched.paymentMethod,
                        startDate: sched.startDate,
                        endDate: sched.endDate,
                        nextDueDate: sched.nextDueDate,
                        lastOccurredDate: null,
                        splits: scheduleSplits,
                        memo: sched.memo ?? '',
                        autoPost: sched.paymentMethodLabel === 'Auto Enter',
                        isActive: true
                    };
                    try {
                        insertRecurringSchedule(newSchedule);
                        existingScheduleKeys.add(dedupeKey);
                        recurringSchedulesCreated++;
                    } catch (schedErr) {
                        console.warn('Could not insert recurring schedule:', schedErr);
                    }
                }
            }

            this.progressPercent.set(96);
            this.currentTable.set('Validating Invariants & Updating Store...');
            await new Promise(resolve => setTimeout(resolve, 20));

            const allTransactionsAfterCommit: Array<ITransaction> = getAllTransactions();
            let allAccountsAfterCommit: Array<IAccount> = getAllAccounts();

            // Recompute cleared & pending balances from committed transactions
            if (txsToCommit.length > 0) {
                const txByAcct = new Map<string, Array<ITransaction>>();
                for (const t of allTransactionsAfterCommit) {
                    const list = txByAcct.get(t.accountId);
                    if (list) {
                        list.push(t);
                    } else {
                        txByAcct.set(t.accountId, [t]);
                    }
                }
                for (const acct of allAccountsAfterCommit) {
                    const acctTxs = txByAcct.get(acct.id);
                    if (!acctTxs || acctTxs.length === 0) continue;
                    const opening = acct.openingBalance ?? 0;
                    const clearedDelta = acctTxs
                        .filter(
                            (t: ITransaction): boolean =>
                                t.status === TransactionStatus.Cleared ||
                                t.status === TransactionStatus.Reconciled
                        )
                        .reduce((sum: number, t: ITransaction): number => sum + t.totalAmount, 0);
                    const pendingDelta = acctTxs.reduce(
                        (sum: number, t: ITransaction): number => sum + t.totalAmount,
                        0
                    );
                    updateAccount({
                        ...acct,
                        clearedBalance: opening + clearedDelta,
                        pendingBalance: opening + pendingDelta,
                        updatedAt: now
                    });
                }
                allAccountsAfterCommit = getAllAccounts();
            }

            // Refresh all LedgerStore signals and commit snapshot
            this.ledgerStore.accounts.set(allAccountsAfterCommit);
            this.ledgerStore.categories.set(getAllCategories());
            this.ledgerStore.payees.set(getAllPayees());
            this.ledgerStore.transactions.set(allTransactionsAfterCommit);
            try {
                this.ledgerStore.schedules.set(getAllRecurringSchedules());
            } catch {
                // Ignore if schedules table query unsupported in test mock
            }
            await this.ledgerStore.commitToLocal();
            this.ledgerStore.isDirty.set(true);

            // Step 6: Run AI Account Health & Cross-Account Augmentation Examination (without auto-augmenting)
            this.progressPercent.set(95);
            this.progressStage.set(MnyParseStage.AiReconciling);
            this.currentTable.set('AI Cross-Account & Ledger Reconciliation...');
            await new Promise(resolve => setTimeout(resolve, 200));

            const aiIntelligenceReport = this.augmentationService
                ? this.augmentationService.analyzeLedgerAccounts(
                      allAccountsAfterCommit,
                      allTransactionsAfterCommit,
                      true
                  )
                : undefined;

            const durationMs: number = Math.round(performance.now() - startTime);

            const report: IMnyAuditReport = {
                accountsCreated,
                categoriesMapped,
                payeesEnriched,
                payeesDeduplicated,
                ignoredNumericPayees: this.aiEnhancer?.ignoredNumericPayeeCount() ?? 0,
                transactionsCommitted: txsToCommit.length,
                transactionsDeduplicated,
                recurringSchedulesCreated,
                splitsBalanced: totalSplitsCount,
                pennyDiscrepancy,
                durationMs,
                aiIntelligenceReport
            };

            this.auditReport.set(report);
            this.progressPercent.set(100);
            this.progressStage.set(MnyParseStage.Complete);
            this.currentTable.set(null);
            this.step.set('report');
            return report;
        } catch (err: unknown) {
            const msg: string =
                err instanceof Error ? err.message : 'Database migration failed unexpectedly';
            this.errorMessage.set(msg);
            this.currentTable.set(null);
            this.step.set('select');
            throw err;
        }
    }

    // --- Private Helper Methods ---

    private executeWorkerInspect(
        buffer: ArrayBuffer,
        password: string = '',
        username?: string
    ): Promise<{
        header: IMnyHeader;
        passwordRequired: boolean;
        isVerified: boolean;
        tableCount: number;
    }> {
        return new Promise<{
            header: IMnyHeader;
            passwordRequired: boolean;
            isVerified: boolean;
            tableCount: number;
        }>((resolve, reject) => {
            const w: Worker | null = this.getOrCreateWorker();
            if (!w) {
                // Fallback to inline parsing for environments without Worker support
                try {
                    const parser: MNYParser = new MNYParser();
                    const bytes: Uint8Array = new Uint8Array(buffer);
                    const header: IMnyHeader = parser.parseHeader(bytes, password);
                    const passwordRequired: boolean = header.encryptionMode !== 0;
                    const isVerified: boolean = header.passwordVerified;
                    let tableCount: number = 0;
                    if (isVerified) {
                        try {
                            const sysTdef = parser.readTableDef(bytes, 2, header);
                            const sysRows = parser.readTableRows(bytes, sysTdef, header);
                            tableCount = sysRows.filter(
                                (r: Record<string, unknown>): boolean => r['Type'] === 1
                            ).length;
                        } catch {
                            tableCount = 0;
                        }
                    }
                    resolve({ header, passwordRequired, isVerified, tableCount });
                } catch (err: unknown) {
                    reject(err);
                }
                return;
            }

            const handler = (event: MessageEvent<MnyWorkerOutboundMessage>): void => {
                this.zone.run(() => {
                    const msg: MnyWorkerOutboundMessage = event.data;
                    if (msg.type === 'inspected') {
                        w.removeEventListener('message', handler);
                        resolve(msg);
                    } else if (msg.type === 'error') {
                        w.removeEventListener('message', handler);
                        reject(new Error(msg.message));
                    }
                });
            };

            w.addEventListener('message', handler);
            const req: MnyWorkerInboundMessage = { type: 'inspect', buffer, password, username };
            w.postMessage(req, [buffer]);
        });
    }

    private executeWorkerParse(
        buffer: ArrayBuffer,
        password: string = '',
        username?: string
    ): Promise<IMnyParseResult> {
        return new Promise<IMnyParseResult>((resolve, reject) => {
            const w: Worker | null = this.getOrCreateWorker();
            if (!w) {
                try {
                    const parser: MNYParser = new MNYParser();
                    const bytes: Uint8Array = new Uint8Array(buffer);
                    const result: IMnyParseResult = parser.parse(
                        bytes,
                        password,
                        (stage: string, pct: number, table?: string) => {
                            this.progressStage.set(stage as MnyParseStage);
                            this.progressPercent.set(pct);
                            this.currentTable.set(table ?? null);
                        }
                    );
                    resolve(result);
                } catch (err: unknown) {
                    reject(err);
                }
                return;
            }

            const handler = (event: MessageEvent<MnyWorkerOutboundMessage>): void => {
                this.zone.run(() => {
                    const msg: MnyWorkerOutboundMessage = event.data;
                    if (msg.type === 'progress') {
                        this.progressStage.set(msg.stage);
                        this.progressPercent.set(msg.percent);
                        this.currentTable.set(msg.currentTable ?? null);
                    } else if (msg.type === 'parse_complete') {
                        w.removeEventListener('message', handler);
                        resolve(msg.result);
                    } else if (msg.type === 'error') {
                        w.removeEventListener('message', handler);
                        reject(new Error(msg.message));
                    }
                });
            };

            w.addEventListener('message', handler);
            const req: MnyWorkerInboundMessage = { type: 'parse', buffer, password, username };
            w.postMessage(req, [buffer]);
        });
    }

    private getOrCreateWorker(): Worker | null {
        if (typeof Worker === 'undefined') {
            return null;
        }
        if (!this.worker) {
            try {
                this.worker = new Worker(
                    new URL('../../workers/mny-import.worker', import.meta.url),
                    {
                        type: 'module'
                    }
                );
            } catch {
                return null;
            }
        }
        return this.worker;
    }

    private terminateWorker(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'cancel' });
            this.worker.terminate();
            this.worker = null;
        }
    }
}
