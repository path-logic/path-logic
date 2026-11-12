import {
    computed,
    inject,
    Injectable,
    signal,
    type Signal,
    type WritableSignal
} from '@angular/core';
import {
    AccountType,
    QifClearedStatus,
    TransactionStatus,
    type Cents,
    type IAccount,
    type ISODateString,
    type ISplit,
    type ITransaction
} from '../../core/domain/types';
import { generateImportHash } from '../../core/engine/hashing';
import type { IMnyAccount, IMnyParseResult, IMnyTransaction } from '../../core/parsers/MNYParser';
import {
    getAllAccounts,
    getAllTransactions,
    insertTransactions,
    updateAccount
} from '../../lib/storage/SQLiteAdapter';
import { LedgerStore } from '../ledger-store/ledger.store';

/**
 * AI-assessed account operational health status.
 */
export enum AccountHealthStatus {
    ActiveCurrent = 'active_current',
    NeedsDataUpload = 'needs_data_upload',
    Closed = 'closed',
    AiInferredClosed = 'ai_inferred_closed'
}

/**
 * Lifecycle state of a cross-account data augmentation opportunity.
 */
export enum AugmentationOpportunityStatus {
    Pending = 'pending',
    Completed = 'completed',
    Dismissed = 'dismissed'
}

/**
 * Direction flow for the shared Account Augmentation Wizard Dialog.
 */
export enum AugmentationWizardFlow {
    SourceToDestinations = 'source_to_destinations',
    DestinationFromSource = 'destination_from_source',
    WorkspaceReconciliation = 'workspace_reconciliation'
}

/**
 * Staged review decision for an opportunity in the Post-Import / Summary Dialog (defaults to Skip).
 */
export enum AugmentationReviewDecision {
    Skip = 'skip',
    Accept = 'accept',
    Dismiss = 'dismiss'
}

/**
 * Per-account AI assessment of closure state, statement currency, and augmentation potential.
 */
export interface IAccountAiAssessment {
    accountId: string;
    mnyAccountId?: number;
    accountName: string;
    accountType: AccountType;
    healthStatus: AccountHealthStatus;
    isClosed: boolean;
    aiInferredClosed: boolean;
    needsDataUpload: boolean;
    lastTransactionDate: ISODateString | null;
    daysBehindLatest: number;
    reconciledTransactionCount: number;
    totalTransactionCount: number;
    currentBalance: Cents;
    recommendation: string;
    canBeAugmentedFromNames: Array<string>;
    canAugmentTargetNames: Array<string>;
}

/**
 * Individual candidate transaction extracted from a reconciled source account
 * to synthesize a missing counter-entry in a destination account.
 */
export interface IAugmentationCandidateTransaction {
    sourceTransactionId: string;
    date: ISODateString;
    sourcePayee: string;
    sourceMemo: string;
    sourceAmount: Cents;
    augmentedAmount: Cents;
    augmentedPayee: string;
    augmentedMemo: string;
    checkNumber: string | null;
    sourceStatus: TransactionStatus;
}

/**
 * Represents a source -> destination augmentation opportunity discovered by AI ledger analysis.
 */
export interface IAccountAugmentationOpportunity {
    id: string;
    sourceAccountId: string;
    sourceAccountName: string;
    sourceAccountType: AccountType;
    destinationAccountId: string;
    destinationAccountName: string;
    destinationAccountType: AccountType;
    candidateTransactions: Array<IAugmentationCandidateTransaction>;
    totalAugmentedAmount: Cents;
    dateRange: {
        from: ISODateString;
        to: ISODateString;
    };
    explanation: string;
    status: AugmentationOpportunityStatus;
    reviewDecision?: AugmentationReviewDecision;
    selectedSourceTransactionIds?: Array<string>;
    sourceBannerDismissed: boolean;
    destinationBannerDismissed: boolean;
}

/**
 * Comprehensive post-import AI intelligence summary across all accounts.
 */
export interface IAccountIntelligenceReport {
    generatedAt: ISODateString;
    assessments: Array<IAccountAiAssessment>;
    closedAccounts: Array<IAccountAiAssessment>;
    needsUploadAccounts: Array<IAccountAiAssessment>;
    opportunities: Array<IAccountAugmentationOpportunity>;
}

const STORAGE_KEY = 'path_logic_account_augmentation_state_v1';
const STALE_UPLOAD_DAYS_THRESHOLD = 45;
const DORMANT_CLOSED_DAYS_THRESHOLD = 180;
const DATE_MATCH_WINDOW_DAYS = 5;

const GENERIC_ACCOUNT_STOP_WORDS = new Set<string>([
    'account',
    'checking',
    'savings',
    'credit',
    'card',
    'visa',
    'mastercard',
    'amex',
    'discover',
    'loan',
    'personal',
    'auto',
    'mortgage',
    'bank',
    'trust',
    'the',
    'and',
    'for',
    'inc',
    'llc',
    'payment',
    'online',
    'transfer',
    'chase',
    'wells',
    'fargo',
    'citi',
    'citibank',
    'capital',
    'one',
    'american',
    'express',
    'suburban',
    'first',
    'national',
    'federal',
    'union',
    'financial',
    'services',
    'prime',
    'blue',
    'gold',
    'platinum',
    'preferred',
    'rewards',
    'cash',
    'contributions'
]);

@Injectable({ providedIn: 'root' })
export class AccountAugmentationService {
    private readonly ledgerStore = inject(LedgerStore);

    /** Latest post-import or workspace-wide AI intelligence report */
    readonly intelligenceReport: WritableSignal<IAccountIntelligenceReport | null> =
        signal<IAccountIntelligenceReport | null>(this.loadPersistedReport());

    /** Controls visibility of the Post-Import AI Notification Dialog */
    readonly isNotificationDialogOpen: WritableSignal<boolean> = signal<boolean>(false);

    /** Controls visibility of the shared Source->Dest / Dest<-Source Augmentation Wizard Dialog */
    readonly isWizardOpen: WritableSignal<boolean> = signal<boolean>(false);

    /** True when the individual account review popup was opened from the Notification Summary Dialog */
    readonly returnToNotificationOnClose: WritableSignal<boolean> = signal<boolean>(false);

    /** Active wizard flow direction */
    readonly wizardFlow: WritableSignal<AugmentationWizardFlow> = signal<AugmentationWizardFlow>(
        AugmentationWizardFlow.SourceToDestinations
    );

    /** Ordered list of augmentation steps in the active wizard session (1..n for Source->Dest, 1 for Dest<-Source) */
    readonly wizardSteps: WritableSignal<Array<IAccountAugmentationOpportunity>> = signal<
        Array<IAccountAugmentationOpportunity>
    >([]);

    /** Active 0-based step index inside the wizard */
    readonly currentStepIndex: WritableSignal<number> = signal<number>(0);

    /** Selected candidate sourceTransactionIds for the active wizard step */
    readonly selectedCandidateIds: WritableSignal<Set<string>> = signal<Set<string>>(
        new Set<string>()
    );

    /** Dismissed upload-needed account banner IDs */
    readonly dismissedUploadBannerAccountIds: WritableSignal<Set<string>> = signal<Set<string>>(
        new Set<string>()
    );

    /** Current opportunity displayed in the wizard */
    readonly currentWizardStep: Signal<IAccountAugmentationOpportunity | null> = computed(
        (): IAccountAugmentationOpportunity | null => {
            const steps = this.wizardSteps();
            const idx = this.currentStepIndex();
            return steps[idx] ?? null;
        }
    );

    /** Selected candidate transactions for the current wizard step */
    readonly selectedStepCandidates: Signal<Array<IAugmentationCandidateTransaction>> = computed(
        (): Array<IAugmentationCandidateTransaction> => {
            const step = this.currentWizardStep();
            if (!step) return [];
            const selected = this.selectedCandidateIds();
            return step.candidateTransactions.filter(c => selected.has(c.sourceTransactionId));
        }
    );

    /** Net augmented amount of currently checked candidate transactions in the active step */
    readonly selectedStepTotalAmount: Signal<Cents> = computed((): Cents => {
        return this.selectedStepCandidates().reduce((sum, c) => sum + c.augmentedAmount, 0);
    });

    /**
     * Examines parsed MS Money data during the Migration Wizard preview step (`Select Data`)
     * to determine which accounts are closed, which need updated data uploaded, and which
     * can be augmented from reconciled transactions in other accounts.
     */
    analyzeMnyPreview(parseResult: IMnyParseResult): Map<number, IAccountAiAssessment> {
        const map = new Map<number, IAccountAiAssessment>();
        if (!parseResult || parseResult.accounts.length === 0) {
            return map;
        }

        // Group transactions by mnyAccountId
        const txsByAcct = new Map<number, Array<IMnyTransaction>>();
        let globalMaxDate: string | null = null;

        for (const tx of parseResult.transactions) {
            const list = txsByAcct.get(tx.mnyAccountId) ?? [];
            list.push(tx);
            txsByAcct.set(tx.mnyAccountId, list);
            if (!globalMaxDate || tx.date > globalMaxDate) {
                globalMaxDate = tx.date;
            }
        }

        const referenceDate = globalMaxDate ?? new Date().toISOString().slice(0, 10);

        // Pre-build initial assessments
        for (const acct of parseResult.accounts) {
            const acctTxs = txsByAcct.get(acct.mnyAccountId) ?? [];
            let lastDate: ISODateString | null = null;
            let reconciledCount = 0;
            let txSum: Cents = 0;

            for (const tx of acctTxs) {
                txSum += tx.amount;
                if (!lastDate || tx.date > lastDate) {
                    lastDate = tx.date as ISODateString;
                }
                if (
                    tx.clearedStatus === QifClearedStatus.Reconciled ||
                    tx.clearedStatus === QifClearedStatus.Cleared
                ) {
                    reconciledCount++;
                }
            }

            const currentBalance: Cents = acct.openingBalance + txSum;
            const daysBehind = lastDate
                ? this.diffDays(lastDate, referenceDate)
                : DORMANT_CLOSED_DAYS_THRESHOLD + 1;

            const aiInferredClosed =
                !acct.isClosed &&
                currentBalance === 0 &&
                (acctTxs.length === 0 || daysBehind >= DORMANT_CLOSED_DAYS_THRESHOLD);

            const needsDataUpload =
                !acct.isClosed &&
                !aiInferredClosed &&
                (acctTxs.length === 0 || daysBehind >= STALE_UPLOAD_DAYS_THRESHOLD);

            let healthStatus = AccountHealthStatus.ActiveCurrent;
            let recommendation = 'Up to date with recent ledger activity';

            if (acct.isClosed) {
                healthStatus = AccountHealthStatus.Closed;
                recommendation = 'Marked closed in MS Money';
            } else if (aiInferredClosed) {
                healthStatus = AccountHealthStatus.AiInferredClosed;
                recommendation = lastDate
                    ? `AI detected $0.00 balance and no activity since ${lastDate} — likely closed or paid off`
                    : 'AI detected $0.00 balance with no recorded activity — likely closed';
            } else if (needsDataUpload) {
                healthStatus = AccountHealthStatus.NeedsDataUpload;
                recommendation = lastDate
                    ? `Last activity on ${lastDate} (${daysBehind} days behind latest data) — needs updated statement upload`
                    : 'Active account with no transactions — needs statement data uploaded';
            }

            map.set(acct.mnyAccountId, {
                accountId: `mny-${acct.mnyAccountId}`,
                mnyAccountId: acct.mnyAccountId,
                accountName: acct.name,
                accountType: acct.mappedType,
                healthStatus,
                isClosed: acct.isClosed,
                aiInferredClosed,
                needsDataUpload,
                lastTransactionDate: lastDate,
                daysBehindLatest: daysBehind,
                reconciledTransactionCount: reconciledCount,
                totalTransactionCount: acctTxs.length,
                currentBalance,
                recommendation,
                canBeAugmentedFromNames: [],
                canAugmentTargetNames: []
            });
        }

        // Detect cross-account augmentation relationships in preview
        for (const sourceAcct of parseResult.accounts) {
            const sourceTxs = txsByAcct.get(sourceAcct.mnyAccountId) ?? [];
            const reconciledSourceTxs = sourceTxs.filter(
                t =>
                    t.clearedStatus === QifClearedStatus.Reconciled ||
                    t.clearedStatus === QifClearedStatus.Cleared
            );
            if (reconciledSourceTxs.length === 0) continue;

            for (const destAcct of parseResult.accounts) {
                if (destAcct.mnyAccountId === sourceAcct.mnyAccountId) continue;
                const destTxs = txsByAcct.get(destAcct.mnyAccountId) ?? [];

                const matchingReconciled = reconciledSourceTxs.filter(
                    sTx =>
                        this.doesMnyTransactionReferenceAccount(sTx, destAcct) &&
                        !this.hasMatchingMnyCounterTransaction(sTx, destTxs)
                );

                if (matchingReconciled.length > 0) {
                    const sourceAssessment = map.get(sourceAcct.mnyAccountId);
                    const destAssessment = map.get(destAcct.mnyAccountId);
                    if (
                        sourceAssessment &&
                        !sourceAssessment.canAugmentTargetNames.includes(destAcct.name)
                    ) {
                        sourceAssessment.canAugmentTargetNames.push(destAcct.name);
                    }
                    if (
                        destAssessment &&
                        !destAssessment.canBeAugmentedFromNames.includes(sourceAcct.name)
                    ) {
                        destAssessment.canBeAugmentedFromNames.push(sourceAcct.name);
                    }
                }
            }
        }

        return map;
    }

    /**
     * Performs full AI examination on committed SQLite / LedgerStore accounts and transactions.
     * Identifies closed accounts, accounts needing updated data uploaded, and cross-account
     * reconciled transaction augmentation opportunities without modifying ledger transactions.
     */
    analyzeLedgerAccounts(
        accountsInput?: Array<IAccount>,
        transactionsInput?: Array<ITransaction>,
        openNotification = false
    ): IAccountIntelligenceReport {
        const accounts =
            accountsInput && accountsInput.length > 0
                ? accountsInput
                : this.ledgerStore.accounts().length > 0
                  ? this.ledgerStore.accounts()
                  : this.safeGetAllAccounts();

        const transactions =
            transactionsInput && transactionsInput.length > 0
                ? transactionsInput
                : this.ledgerStore.transactions().length > 0
                  ? this.ledgerStore.transactions()
                  : this.safeGetAllTransactions();

        const previousReport = this.intelligenceReport();
        const previousOppMap = new Map<string, IAccountAugmentationOpportunity>();
        if (previousReport) {
            for (const prevOpp of previousReport.opportunities) {
                previousOppMap.set(prevOpp.id, prevOpp);
            }
        }

        const txsByAcct = new Map<string, Array<ITransaction>>();
        let globalMaxDate: string | null = null;

        for (const tx of transactions) {
            const list = txsByAcct.get(tx.accountId) ?? [];
            list.push(tx);
            txsByAcct.set(tx.accountId, list);
            if (!globalMaxDate || tx.date > globalMaxDate) {
                globalMaxDate = tx.date;
            }
        }

        const referenceDate = globalMaxDate ?? new Date().toISOString().slice(0, 10);
        const assessments: Array<IAccountAiAssessment> = [];
        const assessmentById = new Map<string, IAccountAiAssessment>();

        for (const acct of accounts) {
            const acctTxs = txsByAcct.get(acct.id) ?? [];
            let lastDate: ISODateString | null = null;
            let reconciledCount = 0;
            let txSum: Cents = 0;

            for (const tx of acctTxs) {
                txSum += tx.totalAmount;
                if (!lastDate || tx.date > lastDate) {
                    lastDate = tx.date;
                }
                if (
                    tx.status === TransactionStatus.Reconciled ||
                    tx.status === TransactionStatus.Cleared
                ) {
                    reconciledCount++;
                }
            }

            const openingBal = acct.openingBalance ?? 0;
            const currentBalance: Cents =
                acctTxs.length > 0 ? openingBal + txSum : acct.clearedBalance;
            const daysBehind = lastDate
                ? this.diffDays(lastDate, referenceDate)
                : DORMANT_CLOSED_DAYS_THRESHOLD + 1;

            const isExplicitlyClosed = !acct.isActive;
            const aiInferredClosed =
                !isExplicitlyClosed &&
                currentBalance === 0 &&
                (acctTxs.length === 0 || daysBehind >= DORMANT_CLOSED_DAYS_THRESHOLD);

            const needsDataUpload =
                !isExplicitlyClosed &&
                !aiInferredClosed &&
                (acctTxs.length === 0 || daysBehind >= STALE_UPLOAD_DAYS_THRESHOLD);

            let healthStatus = AccountHealthStatus.ActiveCurrent;
            let recommendation = 'Up to date with recent ledger activity';

            if (isExplicitlyClosed) {
                healthStatus = AccountHealthStatus.Closed;
                recommendation = 'Marked closed';
            } else if (aiInferredClosed) {
                healthStatus = AccountHealthStatus.AiInferredClosed;
                recommendation = lastDate
                    ? `AI detected $0.00 balance and no activity since ${lastDate} — likely closed or paid off`
                    : 'AI detected $0.00 balance with no recorded activity — likely closed';
            } else if (needsDataUpload) {
                healthStatus = AccountHealthStatus.NeedsDataUpload;
                recommendation = lastDate
                    ? `Last transaction on ${lastDate} (${daysBehind} days behind latest activity) — upload updated QIF/CSV statement`
                    : 'Active account with no transactions — upload QIF/CSV statement data';
            }

            const assessment: IAccountAiAssessment = {
                accountId: acct.id,
                accountName: acct.name,
                accountType: acct.type,
                healthStatus,
                isClosed: isExplicitlyClosed,
                aiInferredClosed,
                needsDataUpload,
                lastTransactionDate: lastDate,
                daysBehindLatest: daysBehind,
                reconciledTransactionCount: reconciledCount,
                totalTransactionCount: acctTxs.length,
                currentBalance,
                recommendation,
                canBeAugmentedFromNames: [],
                canAugmentTargetNames: []
            };
            assessments.push(assessment);
            assessmentById.set(acct.id, assessment);
        }

        // Detect Cross-Account Reconciled Transaction Augmentation Opportunities
        const opportunities: Array<IAccountAugmentationOpportunity> = [];

        for (const sourceAcct of accounts) {
            const sourceTxs = txsByAcct.get(sourceAcct.id) ?? [];
            const reconciledSourceTxs = sourceTxs.filter(
                tx =>
                    tx.status === TransactionStatus.Reconciled ||
                    tx.status === TransactionStatus.Cleared
            );
            if (reconciledSourceTxs.length === 0) continue;

            for (const destAcct of accounts) {
                if (destAcct.id === sourceAcct.id) continue;
                const destTxs = txsByAcct.get(destAcct.id) ?? [];

                const matchingTxs = reconciledSourceTxs.filter(
                    sTx =>
                        this.doesLedgerTransactionReferenceAccount(sTx, destAcct) &&
                        !this.hasMatchingLedgerCounterTransaction(sTx, destTxs)
                );

                if (matchingTxs.length === 0) continue;

                // Sort chronologically ascending
                matchingTxs.sort((a, b) => a.date.localeCompare(b.date));

                const candidates: Array<IAugmentationCandidateTransaction> = matchingTxs.map(
                    sTx => {
                        const augmentedAmount: Cents = -sTx.totalAmount;
                        const actionLabel =
                            destAcct.type === AccountType.Mortgage ||
                            destAcct.type === AccountType.AutoLoan ||
                            destAcct.type === AccountType.PersonalLoan ||
                            destAcct.type === AccountType.Credit
                                ? `Payment from ${sourceAcct.name}`
                                : `Transfer from ${sourceAcct.name}`;
                        const augmentedMemo = sTx.memo
                            ? `${sTx.memo} (Augmented from reconciled ${sourceAcct.name})`
                            : `Augmented from reconciled ${sourceAcct.name} (${sTx.payee})`;

                        return {
                            sourceTransactionId: sTx.id,
                            date: sTx.date,
                            sourcePayee: sTx.payee,
                            sourceMemo: sTx.memo,
                            sourceAmount: sTx.totalAmount,
                            augmentedAmount,
                            augmentedPayee: actionLabel,
                            augmentedMemo,
                            checkNumber: sTx.checkNumber,
                            sourceStatus: sTx.status
                        };
                    }
                );

                const firstDate =
                    candidates[0]?.date ?? (new Date().toISOString().slice(0, 10) as ISODateString);
                const lastDate = candidates[candidates.length - 1]?.date ?? firstDate;
                const totalAugmentedAmount = candidates.reduce(
                    (sum, c) => sum + c.augmentedAmount,
                    0
                );

                const oppId = `aug-${sourceAcct.id}-to-${destAcct.id}`;
                const prev = previousOppMap.get(oppId);

                const opportunity: IAccountAugmentationOpportunity = {
                    id: oppId,
                    sourceAccountId: sourceAcct.id,
                    sourceAccountName: sourceAcct.name,
                    sourceAccountType: sourceAcct.type,
                    destinationAccountId: destAcct.id,
                    destinationAccountName: destAcct.name,
                    destinationAccountType: destAcct.type,
                    candidateTransactions: candidates,
                    totalAugmentedAmount,
                    dateRange: {
                        from: firstDate,
                        to: lastDate
                    },
                    explanation: `${candidates.length} reconciled ${
                        candidates.length === 1 ? 'transaction' : 'transactions'
                    } in ${sourceAcct.name} (${firstDate} to ${lastDate}) can be imported as counter-entries into ${destAcct.name}.`,
                    status: prev?.status ?? AugmentationOpportunityStatus.Pending,
                    reviewDecision: prev?.reviewDecision ?? AugmentationReviewDecision.Skip,
                    selectedSourceTransactionIds:
                        prev?.selectedSourceTransactionIds ??
                        candidates.map(c => c.sourceTransactionId),
                    sourceBannerDismissed: prev?.sourceBannerDismissed ?? false,
                    destinationBannerDismissed: prev?.destinationBannerDismissed ?? false
                };

                opportunities.push(opportunity);

                const sourceAssessment = assessmentById.get(sourceAcct.id);
                const destAssessment = assessmentById.get(destAcct.id);
                if (
                    sourceAssessment &&
                    !sourceAssessment.canAugmentTargetNames.includes(destAcct.name)
                ) {
                    sourceAssessment.canAugmentTargetNames.push(destAcct.name);
                }
                if (
                    destAssessment &&
                    !destAssessment.canBeAugmentedFromNames.includes(sourceAcct.name)
                ) {
                    destAssessment.canBeAugmentedFromNames.push(sourceAcct.name);
                }
            }
        }

        const report: IAccountIntelligenceReport = {
            generatedAt: new Date().toISOString() as ISODateString,
            assessments,
            closedAccounts: assessments.filter(a => a.isClosed || a.aiInferredClosed),
            needsUploadAccounts: assessments.filter(a => a.needsDataUpload),
            opportunities
        };

        this.intelligenceReport.set(report);
        this.persistReport(report);

        if (openNotification) {
            this.isNotificationDialogOpen.set(true);
        }

        return report;
    }

    /**
     * Returns pending augmentation opportunities where `accountId` is the AFFECTED DESTINATION account
     * and the destination banner has not been dismissed.
     */
    getDestinationOpportunitiesForAccount(
        accountId: string | null
    ): Array<IAccountAugmentationOpportunity> {
        if (!accountId) return [];
        const report = this.intelligenceReport();
        if (!report) return [];
        return report.opportunities.filter(
            opp =>
                opp.destinationAccountId === accountId &&
                opp.status === AugmentationOpportunityStatus.Pending &&
                !opp.destinationBannerDismissed &&
                opp.candidateTransactions.length > 0
        );
    }

    /**
     * Returns pending augmentation opportunities where `accountId` is the SOURCE account
     * from which reconciled transactions can be extracted, and the source banner has not been dismissed.
     */
    getSourceOpportunitiesForAccount(
        accountId: string | null
    ): Array<IAccountAugmentationOpportunity> {
        if (!accountId) return [];
        const report = this.intelligenceReport();
        if (!report) return [];
        return report.opportunities.filter(
            opp =>
                opp.sourceAccountId === accountId &&
                opp.status === AugmentationOpportunityStatus.Pending &&
                !opp.sourceBannerDismissed &&
                opp.candidateTransactions.length > 0
        );
    }

    /**
     * Returns the AI health assessment for a specific account ID.
     */
    getAccountAssessment(accountId: string | null): IAccountAiAssessment | null {
        if (!accountId) return null;
        const report = this.intelligenceReport();
        if (!report) return null;
        return report.assessments.find(a => a.accountId === accountId) ?? null;
    }

    /**
     * Formats the Source Account banner message according to the rule:
     * - If <= 2 destination accounts can be augmented from this source account: list the account names.
     * - Otherwise (> 2 destination accounts): return a general message.
     */
    formatSourceBannerMessage(opportunities: Array<IAccountAugmentationOpportunity>): string {
        const destNames = Array.from(new Set(opportunities.map(o => o.destinationAccountName)));
        const totalTxCount = opportunities.reduce(
            (sum, o) => sum + o.candidateTransactions.length,
            0
        );

        if (destNames.length === 0) {
            return '';
        }
        if (destNames.length === 1) {
            return `${totalTxCount} reconciled ${
                totalTxCount === 1 ? 'transaction' : 'transactions'
            } in this account can augment ${destNames[0]}.`;
        }
        if (destNames.length === 2) {
            return `${totalTxCount} reconciled ${
                totalTxCount === 1 ? 'transaction' : 'transactions'
            } in this account can augment ${destNames[0]} and ${destNames[1]}.`;
        }
        return `${totalTxCount} reconciled ${
            totalTxCount === 1 ? 'transaction' : 'transactions'
        } in this account can augment ${destNames.length} accounts across your workspace.`;
    }

    /**
     * Formats the Destination Account banner message explaining which source account(s)
     * have reconciled transactions available to augment this account's ledger.
     */
    formatDestinationBannerMessage(opportunities: Array<IAccountAugmentationOpportunity>): string {
        if (opportunities.length === 0) return '';
        const sourceNames = Array.from(new Set(opportunities.map(o => o.sourceAccountName)));
        const totalTxCount = opportunities.reduce(
            (sum, o) => sum + o.candidateTransactions.length,
            0
        );

        if (sourceNames.length === 1) {
            return `${totalTxCount} reconciled ${
                totalTxCount === 1 ? 'transaction' : 'transactions'
            } from ${sourceNames[0]} can augment this account's ledger.`;
        }
        if (sourceNames.length === 2) {
            return `${totalTxCount} reconciled ${
                totalTxCount === 1 ? 'transaction' : 'transactions'
            } from ${sourceNames[0]} and ${sourceNames[1]} can augment this account's ledger.`;
        }
        return `${totalTxCount} reconciled transactions across ${sourceNames.length} accounts can augment this account's ledger.`;
    }

    /**
     * Returns all pending cross-account augmentation opportunities across the entire workspace.
     */
    getAllPendingOpportunities(): Array<IAccountAugmentationOpportunity> {
        const report = this.intelligenceReport();
        if (!report) return [];
        return report.opportunities.filter(
            opp =>
                opp.status === AugmentationOpportunityStatus.Pending &&
                opp.candidateTransactions.length > 0
        );
    }

    /**
     * Opens the Cross-Account Reconciliation & Augmentation Wizard from the Accounts page menu
     * or Account Ledger menu. Scans the workspace for reconciled cross-account transfers and
     * steps through all pending opportunities (or shows the all-reconciled summary if none remain).
     */
    openWorkspaceReconciliationWizard(focusAccountId?: string | null): void {
        const report = this.analyzeLedgerAccounts(undefined, undefined, false);

        let steps = report.opportunities.filter(
            opp =>
                opp.status === AugmentationOpportunityStatus.Pending &&
                opp.candidateTransactions.length > 0
        );

        // If user explicitly launched the wizard from the menu and all opportunities were previously dismissed,
        // resurface dismissed opportunities that still have un-imported candidate transactions.
        if (steps.length === 0) {
            const dismissedWithCandidates = report.opportunities.filter(
                opp =>
                    opp.status === AugmentationOpportunityStatus.Dismissed &&
                    opp.candidateTransactions.length > 0
            );
            if (dismissedWithCandidates.length > 0) {
                const reopened = report.opportunities.map(opp =>
                    opp.status === AugmentationOpportunityStatus.Dismissed
                        ? {
                              ...opp,
                              status: AugmentationOpportunityStatus.Pending,
                              sourceBannerDismissed: false,
                              destinationBannerDismissed: false
                          }
                        : opp
                );
                const updatedReport: IAccountIntelligenceReport = {
                    ...report,
                    opportunities: reopened
                };
                this.intelligenceReport.set(updatedReport);
                this.persistReport(updatedReport);
                steps = reopened.filter(
                    opp =>
                        opp.status === AugmentationOpportunityStatus.Pending &&
                        opp.candidateTransactions.length > 0
                );
            }
        }

        // If launched from a specific account ledger, prioritize opportunities involving that account first
        if (focusAccountId && steps.length > 1) {
            const focused = steps.filter(
                s =>
                    s.destinationAccountId === focusAccountId ||
                    s.sourceAccountId === focusAccountId
            );
            const others = steps.filter(
                s =>
                    s.destinationAccountId !== focusAccountId &&
                    s.sourceAccountId !== focusAccountId
            );
            steps = [...focused, ...others];
        }

        this.returnToNotificationOnClose.set(false);
        this.wizardFlow.set(AugmentationWizardFlow.WorkspaceReconciliation);
        this.wizardSteps.set(steps);
        this.currentStepIndex.set(0);
        this.syncSelectedCandidatesForCurrentStep();
        this.isWizardOpen.set(true);
    }

    /**
     * Opens the Augmentation Wizard in `SourceToDestinations` (`source -> destination 1...n`) mode.
     * Any step/account in the wizard can be accepted, skipped, or dismissed.
     */
    openWizardForSource(sourceAccountId: string): void {
        const steps = this.getSourceOpportunitiesForAccount(sourceAccountId);
        if (steps.length === 0) return;

        this.returnToNotificationOnClose.set(false);
        this.wizardFlow.set(AugmentationWizardFlow.SourceToDestinations);
        this.wizardSteps.set(steps);
        this.currentStepIndex.set(0);
        this.syncSelectedCandidatesForCurrentStep();
        this.isWizardOpen.set(true);
    }

    /**
     * Opens the exact same Augmentation Wizard Dialog in `DestinationFromSource` (`destination <- source`)
     * flow with a single step (or the steps targeting this destination account).
     */
    openWizardForDestination(destinationAccountId: string, sourceAccountId?: string): void {
        let steps = this.getDestinationOpportunitiesForAccount(destinationAccountId);
        if (sourceAccountId) {
            steps = steps.filter(s => s.sourceAccountId === sourceAccountId);
        }
        if (steps.length === 0) return;

        this.returnToNotificationOnClose.set(false);
        this.wizardFlow.set(AugmentationWizardFlow.DestinationFromSource);
        this.wizardSteps.set(steps);
        this.currentStepIndex.set(0);
        this.syncSelectedCandidatesForCurrentStep();
        this.isWizardOpen.set(true);
    }

    /**
     * Opens the individual opportunity review popup from the Post-Import / Summary Notification Dialog.
     * Any action taken inside the review popup records the decision, closes the review popup,
     * and returns focus to the Summary Notification Dialog.
     */
    openReviewFromNotification(opportunityId: string): void {
        const report = this.intelligenceReport();
        if (!report) return;
        const target = report.opportunities.find(o => o.id === opportunityId);
        if (!target) return;

        this.returnToNotificationOnClose.set(true);
        this.isNotificationDialogOpen.set(false);
        this.wizardFlow.set(AugmentationWizardFlow.DestinationFromSource);
        this.wizardSteps.set([target]);
        this.currentStepIndex.set(0);
        this.syncSelectedCandidatesForCurrentStep();
        this.isWizardOpen.set(true);
    }

    /**
     * Updates the staged review decision for a single opportunity in the Summary Notification Dialog.
     */
    setOpportunityReviewDecision(
        opportunityId: string,
        decision: AugmentationReviewDecision,
        selectedSourceTransactionIds?: Array<string>
    ): void {
        const report = this.intelligenceReport();
        if (!report) return;

        const updatedOpportunities = report.opportunities.map(opp => {
            if (opp.id !== opportunityId) return opp;
            return {
                ...opp,
                reviewDecision: decision,
                ...(selectedSourceTransactionIds ? { selectedSourceTransactionIds } : {})
            };
        });

        const nextReport: IAccountIntelligenceReport = {
            ...report,
            opportunities: updatedOpportunities
        };
        this.intelligenceReport.set(nextReport);
        this.persistReport(nextReport);
    }

    /**
     * Bulk-updates the staged review decision (`Accept`, `Skip`, or `Dismiss`) for all opportunities
     * in the Summary Notification Dialog without needing to review each account 1 by 1.
     */
    setAllOpportunitiesReviewDecision(decision: AugmentationReviewDecision): void {
        const report = this.intelligenceReport();
        if (!report) return;

        const updatedOpportunities = report.opportunities.map(opp =>
            opp.status === AugmentationOpportunityStatus.Pending
                ? {
                      ...opp,
                      reviewDecision: decision,
                      selectedSourceTransactionIds:
                          opp.selectedSourceTransactionIds &&
                          opp.selectedSourceTransactionIds.length > 0
                              ? opp.selectedSourceTransactionIds
                              : opp.candidateTransactions.map(c => c.sourceTransactionId)
                  }
                : opp
        );

        const nextReport: IAccountIntelligenceReport = {
            ...report,
            opportunities: updatedOpportunities
        };
        this.intelligenceReport.set(nextReport);
        this.persistReport(nextReport);
    }

    /**
     * Applies all staged review decisions in the Summary Notification Dialog:
     * - `Accept`: synthesizes and commits the selected counter-entries into the destination account.
     * - `Dismiss`: marks the opportunity as dismissed so banners do not appear.
     * - `Skip` (default): leaves the opportunity pending so dismissable banners appear in the ledgers.
     */
    async applyNotificationReviewDecisions(): Promise<number> {
        const report = this.intelligenceReport();
        if (!report) {
            this.closeNotificationDialog();
            return 0;
        }

        let totalCommittedTransactions = 0;
        const now: ISODateString = new Date().toISOString() as ISODateString;
        const allNewTransactions: Array<ITransaction> = [];
        const netDeltaByAccount = new Map<string, Cents>();
        const completedOppIds = new Set<string>();
        const dismissedOppIds = new Set<string>();

        for (const opp of report.opportunities) {
            if (opp.status !== AugmentationOpportunityStatus.Pending) continue;
            const decision = opp.reviewDecision ?? AugmentationReviewDecision.Skip;

            if (decision === AugmentationReviewDecision.Accept) {
                const selectedSet = new Set<string>(
                    opp.selectedSourceTransactionIds && opp.selectedSourceTransactionIds.length > 0
                        ? opp.selectedSourceTransactionIds
                        : opp.candidateTransactions.map(c => c.sourceTransactionId)
                );
                const selectedCandidates = opp.candidateTransactions.filter(c =>
                    selectedSet.has(c.sourceTransactionId)
                );

                if (selectedCandidates.length > 0) {
                    const createdForOpp: Array<ITransaction> = selectedCandidates.map(
                        (cand, idx): ITransaction => {
                            const txId = `tx-aug-${opp.destinationAccountId}-${cand.sourceTransactionId}-${Date.now()}-${idx}`;
                            const split: ISplit = {
                                id: `split-${txId}-0`,
                                categoryId: null,
                                memo: cand.augmentedMemo,
                                amount: cand.augmentedAmount
                            };
                            const importHash = generateImportHash(
                                cand.date,
                                cand.augmentedAmount,
                                cand.augmentedPayee
                            );

                            return {
                                id: txId,
                                accountId: opp.destinationAccountId,
                                payeeId: `payee-aug-${opp.sourceAccountId}`,
                                payee: cand.augmentedPayee,
                                date: cand.date,
                                memo: cand.augmentedMemo,
                                totalAmount: cand.augmentedAmount,
                                status: TransactionStatus.Cleared,
                                splits: [split],
                                checkNumber: cand.checkNumber,
                                importHash,
                                linkedTransferId: cand.sourceTransactionId,
                                createdAt: now,
                                updatedAt: now
                            };
                        }
                    );

                    const delta = createdForOpp.reduce((sum, tx) => sum + tx.totalAmount, 0);
                    netDeltaByAccount.set(
                        opp.destinationAccountId,
                        (netDeltaByAccount.get(opp.destinationAccountId) ?? 0) + delta
                    );
                    allNewTransactions.push(...createdForOpp);
                    totalCommittedTransactions += createdForOpp.length;
                    completedOppIds.add(opp.id);
                }
            } else if (decision === AugmentationReviewDecision.Dismiss) {
                dismissedOppIds.add(opp.id);
            }
        }

        if (allNewTransactions.length > 0) {
            try {
                insertTransactions(allNewTransactions);
            } catch {
                // Ignore if WASM SQLite not initialized in unit tests
            }

            const currentAccounts = this.ledgerStore.accounts();
            const updatedAccounts = currentAccounts.map((acct): IAccount => {
                const delta = netDeltaByAccount.get(acct.id);
                if (delta === undefined) return acct;
                const updated: IAccount = {
                    ...acct,
                    clearedBalance: acct.clearedBalance + delta,
                    pendingBalance: acct.pendingBalance + delta,
                    updatedAt: now
                };
                try {
                    updateAccount(updated);
                } catch {
                    // Ignore in unit tests
                }
                return updated;
            });

            this.ledgerStore.accounts.set(updatedAccounts);
            this.ledgerStore.transactions.set([
                ...this.ledgerStore.transactions(),
                ...allNewTransactions
            ]);
            try {
                await this.ledgerStore.commitToLocal();
            } catch {
                // Ignore in unit tests
            }
            this.ledgerStore.isDirty.set(true);
        }

        const updatedOpportunities = report.opportunities.map(opp => {
            if (completedOppIds.has(opp.id)) {
                return {
                    ...opp,
                    status: AugmentationOpportunityStatus.Completed,
                    reviewDecision: AugmentationReviewDecision.Accept
                };
            }
            if (dismissedOppIds.has(opp.id)) {
                return {
                    ...opp,
                    status: AugmentationOpportunityStatus.Dismissed,
                    reviewDecision: AugmentationReviewDecision.Dismiss,
                    sourceBannerDismissed: true,
                    destinationBannerDismissed: true
                };
            }
            return {
                ...opp,
                reviewDecision: AugmentationReviewDecision.Skip
            };
        });

        const nextReport: IAccountIntelligenceReport = {
            ...report,
            opportunities: updatedOpportunities
        };
        this.intelligenceReport.set(nextReport);
        this.persistReport(nextReport);
        this.closeNotificationDialog();

        return totalCommittedTransactions;
    }

    /**
     * Navigates directly to a specific step index in the wizard.
     */
    goToWizardStep(index: number): void {
        const steps = this.wizardSteps();
        if (index >= 0 && index < steps.length) {
            this.currentStepIndex.set(index);
            this.syncSelectedCandidatesForCurrentStep();
        }
    }

    /**
     * Toggles selection of a candidate transaction in the active wizard step.
     */
    toggleCandidateTransaction(sourceTransactionId: string): void {
        const next = new Set<string>(this.selectedCandidateIds());
        if (next.has(sourceTransactionId)) {
            next.delete(sourceTransactionId);
        } else {
            next.add(sourceTransactionId);
        }
        this.selectedCandidateIds.set(next);
    }

    /**
     * Selects or deselects all candidate transactions in the active wizard step.
     */
    toggleAllCandidatesInStep(): void {
        const step = this.currentWizardStep();
        if (!step) return;
        const current = this.selectedCandidateIds();
        if (current.size === step.candidateTransactions.length) {
            this.selectedCandidateIds.set(new Set<string>());
        } else {
            this.selectedCandidateIds.set(
                new Set<string>(step.candidateTransactions.map(c => c.sourceTransactionId))
            );
        }
    }

    /**
     * Accepts the current wizard step: imports the selected augmented transactions into
     * the destination account, updates SQLite and LedgerStore, marks the opportunity Completed,
     * and advances to the next step (or closes the wizard if complete).
     */
    async acceptCurrentStep(): Promise<number> {
        const step = this.currentWizardStep();
        if (!step) return 0;

        const selectedCandidates = this.selectedStepCandidates();
        if (selectedCandidates.length === 0) {
            this.skipCurrentStep();
            return 0;
        }

        // If this popup was opened via 'Review' from the Summary Notification Dialog,
        // record the 'Accept' decision and selected transactions, close the review popup,
        // and return to the Summary Notification Dialog without completing/exiting the summary flow.
        if (this.returnToNotificationOnClose()) {
            this.setOpportunityReviewDecision(
                step.id,
                AugmentationReviewDecision.Accept,
                selectedCandidates.map(c => c.sourceTransactionId)
            );
            this.closeWizard();
            return selectedCandidates.length;
        }

        const now: ISODateString = new Date().toISOString() as ISODateString;
        const newTransactions: Array<ITransaction> = selectedCandidates.map(
            (cand, idx): ITransaction => {
                const txId = `tx-aug-${step.destinationAccountId}-${cand.sourceTransactionId}-${Date.now()}-${idx}`;
                const split: ISplit = {
                    id: `split-${txId}-0`,
                    categoryId: null,
                    memo: cand.augmentedMemo,
                    amount: cand.augmentedAmount
                };
                const importHash = generateImportHash(
                    cand.date,
                    cand.augmentedAmount,
                    cand.augmentedPayee
                );

                return {
                    id: txId,
                    accountId: step.destinationAccountId,
                    payeeId: `payee-aug-${step.sourceAccountId}`,
                    payee: cand.augmentedPayee,
                    date: cand.date,
                    memo: cand.augmentedMemo,
                    totalAmount: cand.augmentedAmount,
                    status: TransactionStatus.Cleared,
                    splits: [split],
                    checkNumber: cand.checkNumber,
                    importHash,
                    linkedTransferId: cand.sourceTransactionId,
                    createdAt: now,
                    updatedAt: now
                };
            }
        );

        const netDelta: Cents = newTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

        try {
            insertTransactions(newTransactions);
        } catch {
            // In unit test environments without initialized WASM SQLite, continue updating store signals
        }

        // Update destination account balance in store & SQLite
        const currentAccounts = this.ledgerStore.accounts();
        const updatedAccounts = currentAccounts.map((acct): IAccount => {
            if (acct.id !== step.destinationAccountId) return acct;
            const updated: IAccount = {
                ...acct,
                clearedBalance: acct.clearedBalance + netDelta,
                pendingBalance: acct.pendingBalance + netDelta,
                updatedAt: now
            };
            try {
                updateAccount(updated);
            } catch {
                // Ignore if DB not initialized in unit test
            }
            return updated;
        });

        this.ledgerStore.accounts.set(updatedAccounts);
        this.ledgerStore.transactions.set([...this.ledgerStore.transactions(), ...newTransactions]);
        try {
            await this.ledgerStore.commitToLocal();
        } catch {
            // Ignore in unit test
        }
        this.ledgerStore.isDirty.set(true);

        this.updateOpportunityState(step.id, {
            status: AugmentationOpportunityStatus.Completed
        });

        this.advanceOrCloseWizard(step.id);
        return newTransactions.length;
    }

    /**
     * Skips the current wizard step without importing or permanently dismissing it,
     * advancing to the next step or closing the wizard if at the end.
     */
    skipCurrentStep(): void {
        const step = this.currentWizardStep();
        if (this.returnToNotificationOnClose() && step) {
            this.setOpportunityReviewDecision(
                step.id,
                AugmentationReviewDecision.Skip,
                Array.from(this.selectedCandidateIds())
            );
            this.closeWizard();
            return;
        }

        const steps = this.wizardSteps();
        const idx = this.currentStepIndex();
        if (idx + 1 < steps.length) {
            this.currentStepIndex.set(idx + 1);
            this.syncSelectedCandidatesForCurrentStep();
        } else {
            this.closeWizard();
        }
    }

    /**
     * Dismisses (ignores) the current wizard step so the banner and wizard will no longer
     * prompt for this source -> destination pair, then advances or closes the wizard.
     */
    dismissCurrentStep(): void {
        const step = this.currentWizardStep();
        if (!step) return;

        if (this.returnToNotificationOnClose()) {
            this.setOpportunityReviewDecision(
                step.id,
                AugmentationReviewDecision.Dismiss,
                Array.from(this.selectedCandidateIds())
            );
            this.closeWizard();
            return;
        }

        this.updateOpportunityState(step.id, {
            status: AugmentationOpportunityStatus.Dismissed,
            reviewDecision: AugmentationReviewDecision.Dismiss,
            sourceBannerDismissed: true,
            destinationBannerDismissed: true
        });

        this.advanceOrCloseWizard(step.id);
    }

    /**
     * Dismisses the Destination Augmentation Banner in the affected account's ledger.
     */
    dismissDestinationBanner(destinationAccountId: string): void {
        const report = this.intelligenceReport();
        if (!report) return;

        const updatedOpportunities = report.opportunities.map(opp =>
            opp.destinationAccountId === destinationAccountId
                ? {
                      ...opp,
                      destinationBannerDismissed: true,
                      status:
                          opp.status === AugmentationOpportunityStatus.Pending
                              ? AugmentationOpportunityStatus.Dismissed
                              : opp.status
                  }
                : opp
        );

        const nextReport: IAccountIntelligenceReport = {
            ...report,
            opportunities: updatedOpportunities
        };
        this.intelligenceReport.set(nextReport);
        this.persistReport(nextReport);
    }

    /**
     * Dismisses the Source Augmentation Banner in the source account's ledger.
     */
    dismissSourceBanner(sourceAccountId: string): void {
        const report = this.intelligenceReport();
        if (!report) return;

        const updatedOpportunities = report.opportunities.map(opp =>
            opp.sourceAccountId === sourceAccountId
                ? {
                      ...opp,
                      sourceBannerDismissed: true
                  }
                : opp
        );

        const nextReport: IAccountIntelligenceReport = {
            ...report,
            opportunities: updatedOpportunities
        };
        this.intelligenceReport.set(nextReport);
        this.persistReport(nextReport);
    }

    /**
     * Dismisses the "Needs Updated Data Uploaded" banner for an account.
     */
    dismissUploadNotice(accountId: string): void {
        const next = new Set<string>(this.dismissedUploadBannerAccountIds());
        next.add(accountId);
        this.dismissedUploadBannerAccountIds.set(next);
    }

    /**
     * Closes the Augmentation Wizard Dialog.
     */
    closeWizard(): void {
        const shouldReturnToNotification = this.returnToNotificationOnClose();
        this.isWizardOpen.set(false);
        this.wizardSteps.set([]);
        this.currentStepIndex.set(0);
        this.selectedCandidateIds.set(new Set<string>());
        this.returnToNotificationOnClose.set(false);
        if (shouldReturnToNotification) {
            this.isNotificationDialogOpen.set(true);
        }
    }

    /**
     * Closes the Post-Import AI Notification Dialog.
     */
    closeNotificationDialog(): void {
        this.isNotificationDialogOpen.set(false);
    }

    // --- Private Helpers ---

    private syncSelectedCandidatesForCurrentStep(): void {
        const step = this.currentWizardStep();
        if (!step) {
            this.selectedCandidateIds.set(new Set<string>());
            return;
        }
        const preset =
            step.selectedSourceTransactionIds && step.selectedSourceTransactionIds.length > 0
                ? step.selectedSourceTransactionIds
                : step.candidateTransactions.map(c => c.sourceTransactionId);
        this.selectedCandidateIds.set(new Set<string>(preset));
    }

    private advanceOrCloseWizard(completedOrDismissedOppId: string): void {
        const currentSteps = this.wizardSteps();
        const currentIndex = this.currentStepIndex();
        const remainingSteps = currentSteps.filter(s => s.id !== completedOrDismissedOppId);

        if (remainingSteps.length === 0 || currentIndex >= currentSteps.length - 1) {
            this.closeWizard();
            return;
        }

        const nextIndex = Math.min(currentIndex, remainingSteps.length - 1);
        this.wizardSteps.set(remainingSteps);
        this.currentStepIndex.set(nextIndex);
        this.syncSelectedCandidatesForCurrentStep();
    }

    private updateOpportunityState(
        opportunityId: string,
        patch: Partial<IAccountAugmentationOpportunity>
    ): void {
        const report = this.intelligenceReport();
        if (!report) return;

        const updatedOpportunities = report.opportunities.map(opp =>
            opp.id === opportunityId ? { ...opp, ...patch } : opp
        );

        const nextReport: IAccountIntelligenceReport = {
            ...report,
            opportunities: updatedOpportunities
        };
        this.intelligenceReport.set(nextReport);
        this.persistReport(nextReport);
    }

    private doesMnyTransactionReferenceAccount(
        tx: IMnyTransaction,
        destAcct: IMnyAccount
    ): boolean {
        if (
            tx.linkedMnyAccountId !== undefined &&
            tx.linkedMnyAccountId !== null &&
            tx.linkedMnyAccountId === destAcct.mnyAccountId
        ) {
            return true;
        }
        const splitTexts = (tx.splits ?? [])
            .map(s => `${s.category ?? ''} ${s.memo ?? ''}`)
            .join(' ');
        const haystack =
            `${tx.payee} ${tx.memo ?? ''} ${tx.category ?? ''} ${splitTexts}`.toLowerCase();
        return this.matchesAccountIdentity(haystack, destAcct.name, destAcct.abbreviation ?? null);
    }

    private doesLedgerTransactionReferenceAccount(tx: ITransaction, destAcct: IAccount): boolean {
        const splitTexts = (tx.splits ?? []).map(s => s.memo ?? '').join(' ');
        const haystack = `${tx.payee} ${tx.memo} ${splitTexts}`.toLowerCase();
        return this.matchesAccountIdentity(haystack, destAcct.name, destAcct.abbreviation ?? null);
    }

    private matchesAccountIdentity(
        lowerHaystack: string,
        accountName: string,
        abbreviation: string | null
    ): boolean {
        const cleanAcctName = accountName.trim().toLowerCase();
        if (!cleanAcctName) return false;

        // 1. Direct full account name match (e.g. "2005 g35", "condo", "student loan", "amazon prime visa")
        if (lowerHaystack.includes(cleanAcctName)) {
            return true;
        }

        // 2. Abbreviation match if >= 3 chars as a word boundary
        if (abbreviation && abbreviation.trim().length >= 3) {
            const cleanAbbrev = this.escapeRegExp(abbreviation.trim().toLowerCase());
            if (new RegExp(`\\b${cleanAbbrev}\\b`, 'i').test(lowerHaystack)) {
                return true;
            }
        }

        // 3. Distinctive token match for account names (e.g. "2001 Cobra" -> "cobra", "304 Blackhawk" -> "blackhawk")
        const tokens = cleanAcctName
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(
                t =>
                    t.length >= 3 && !GENERIC_ACCOUNT_STOP_WORDS.has(t) && !/^(19|20)\d{2}$/.test(t)
            );

        if (tokens.length === 1) {
            const singleToken = tokens[0];
            if (singleToken && singleToken.length >= 4) {
                const escaped = this.escapeRegExp(singleToken);
                return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerHaystack);
            }
        } else if (tokens.length >= 2) {
            return tokens.every(token => {
                const escaped = this.escapeRegExp(token);
                return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerHaystack);
            });
        }

        return false;
    }

    private hasMatchingMnyCounterTransaction(
        sourceTx: IMnyTransaction,
        destTxs: Array<IMnyTransaction>
    ): boolean {
        const absAmount = Math.abs(sourceTx.amount);
        for (const dTx of destTxs) {
            if (Math.abs(dTx.amount) === absAmount) {
                if (Math.abs(this.diffDays(sourceTx.date, dTx.date)) <= DATE_MATCH_WINDOW_DAYS) {
                    return true;
                }
            }
        }
        return false;
    }

    private hasMatchingLedgerCounterTransaction(
        sourceTx: ITransaction,
        destTxs: Array<ITransaction>
    ): boolean {
        const absAmount = Math.abs(sourceTx.totalAmount);
        for (const dTx of destTxs) {
            if (
                dTx.linkedTransferId === sourceTx.id ||
                (Math.abs(dTx.totalAmount) === absAmount &&
                    Math.abs(this.diffDays(sourceTx.date, dTx.date)) <= DATE_MATCH_WINDOW_DAYS)
            ) {
                return true;
            }
        }
        return false;
    }

    private diffDays(dateA: string, dateB: string): number {
        const msA = Date.parse(dateA);
        const msB = Date.parse(dateB);
        if (Number.isNaN(msA) || Number.isNaN(msB)) return 0;
        return Math.round((msB - msA) / 86400000);
    }

    private escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private safeGetAllAccounts(): Array<IAccount> {
        try {
            return getAllAccounts();
        } catch {
            return [];
        }
    }

    private safeGetAllTransactions(): Array<ITransaction> {
        try {
            return getAllTransactions();
        } catch {
            return [];
        }
    }

    private persistReport(report: IAccountIntelligenceReport): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
            }
        } catch {
            // Ignore storage quota / SSR errors
        }
    }

    private loadPersistedReport(): IAccountIntelligenceReport | null {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    return JSON.parse(raw) as IAccountIntelligenceReport;
                }
            }
        } catch {
            // Ignore corrupt storage
        }
        return null;
    }
}
