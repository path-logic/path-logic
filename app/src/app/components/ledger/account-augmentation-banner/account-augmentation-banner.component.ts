import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
    AccountAugmentationService,
    AccountHealthStatus,
    AugmentationOpportunityStatus,
    AugmentationReviewDecision,
    AugmentationWizardFlow,
    type IAccountAiAssessment,
    type IAccountAugmentationOpportunity
} from '../../../services/import-export/account-augmentation.service';

@Component({
    selector: 'app-account-augmentation-banner',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
    templateUrl: './account-augmentation-banner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountAugmentationBannerComponent {
    /** Active account ID when mounted inside an account ledger, or null when mounted globally for dialogs */
    readonly accountId = input<string | null>(null);

    /** When true, only renders the Notification Dialog and Augmentation Wizard Dialog (no inline banners) */
    readonly dialogsOnly = input<boolean>(false);

    /** Emitted when user clicks 'Upload Statement' on a stale account banner */
    readonly requestUpload = output();

    readonly augmentationService = inject(AccountAugmentationService);
    private readonly router = inject(Router, { optional: true });

    readonly AccountHealthStatus = AccountHealthStatus;
    readonly AugmentationOpportunityStatus = AugmentationOpportunityStatus;
    readonly AugmentationReviewDecision = AugmentationReviewDecision;
    readonly AugmentationWizardFlow = AugmentationWizardFlow;

    /** Pending destination opportunities where the current account is the affected destination (`destination <- source`) */
    readonly destinationOpportunities = computed<Array<IAccountAugmentationOpportunity>>(() => {
        const id = this.accountId();
        if (!id || this.dialogsOnly()) return [];
        return this.augmentationService.getDestinationOpportunitiesForAccount(id);
    });

    /** Pending source opportunities where the current account is the extraction source (`source -> destination 1...n`) */
    readonly sourceOpportunities = computed<Array<IAccountAugmentationOpportunity>>(() => {
        const id = this.accountId();
        if (!id || this.dialogsOnly()) return [];
        return this.augmentationService.getSourceOpportunitiesForAccount(id);
    });

    /** Formatted message for the destination ledger banner */
    readonly destinationBannerMessage = computed<string>(() => {
        const opps = this.destinationOpportunities();
        if (opps.length === 0) return '';
        return this.augmentationService.formatDestinationBannerMessage(opps);
    });

    /** Formatted message for the source ledger banner (lists account names if <= 2, otherwise general message) */
    readonly sourceBannerMessage = computed<string>(() => {
        const opps = this.sourceOpportunities();
        if (opps.length === 0) return '';
        return this.augmentationService.formatSourceBannerMessage(opps);
    });

    /** AI assessment for the current active account */
    readonly activeAccountAssessment = computed<IAccountAiAssessment | null>(() => {
        const id = this.accountId();
        if (!id || this.dialogsOnly()) return null;
        return this.augmentationService.getAccountAssessment(id);
    });

    /** Whether to show a dismissable 'Needs Updated Data Uploaded' notice for this account */
    readonly showNeedsUploadBanner = computed<boolean>(() => {
        const id = this.accountId();
        if (!id || this.dialogsOnly()) return false;
        if (this.augmentationService.dismissedUploadBannerAccountIds().has(id)) return false;
        const assessment = this.activeAccountAssessment();
        return assessment?.healthStatus === AccountHealthStatus.NeedsDataUpload;
    });

    /** Current opportunity step in the Augmentation Wizard */
    readonly currentWizardOpportunity = computed<IAccountAugmentationOpportunity | null>(() => {
        return this.augmentationService.currentWizardStep();
    });

    /** All opportunities in the active wizard session */
    readonly wizardOpportunities = computed<Array<IAccountAugmentationOpportunity>>(() => {
        return this.augmentationService.wizardSteps();
    });

    /** Selected candidate transaction IDs for the current step */
    readonly selectedCandidateTxIds = computed<Array<string>>(() => {
        return Array.from(this.augmentationService.selectedCandidateIds());
    });

    /** Net balance impact of selected candidate transactions in cents */
    readonly selectedNetImpactCents = computed<number>(() => {
        return this.augmentationService.selectedStepTotalAmount();
    });

    /** Counts of staged decisions in the Summary Notification Dialog */
    readonly summaryDecisionCounts = computed<{
        accept: number;
        skip: number;
        dismiss: number;
    }>(() => {
        const report = this.augmentationService.intelligenceReport();
        if (!report) return { accept: 0, skip: 0, dismiss: 0 };
        let accept = 0;
        let skip = 0;
        let dismiss = 0;
        for (const opp of report.opportunities) {
            if (opp.status !== AugmentationOpportunityStatus.Pending) continue;
            const decision = opp.reviewDecision ?? AugmentationReviewDecision.Skip;
            if (decision === AugmentationReviewDecision.Accept) {
                accept++;
            } else if (decision === AugmentationReviewDecision.Dismiss) {
                dismiss++;
            } else {
                skip++;
            }
        }
        return { accept, skip, dismiss };
    });

    // --- Banner Actions ---

    openDestinationWizard(): void {
        const id = this.accountId();
        if (!id) return;
        const opps = this.destinationOpportunities();
        const firstSourceId = opps.length === 1 ? opps[0]?.sourceAccountId : undefined;
        this.augmentationService.openWizardForDestination(id, firstSourceId);
    }

    openSourceWizard(): void {
        const id = this.accountId();
        if (!id) return;
        this.augmentationService.openWizardForSource(id);
    }

    dismissDestinationBanner(): void {
        const id = this.accountId();
        if (!id) return;
        this.augmentationService.dismissDestinationBanner(id);
    }

    dismissSourceBanner(): void {
        const id = this.accountId();
        if (!id) return;
        this.augmentationService.dismissSourceBanner(id);
    }

    dismissNeedsUploadBanner(): void {
        const id = this.accountId();
        if (!id) return;
        this.augmentationService.dismissUploadNotice(id);
    }

    // --- Wizard Actions ---

    isCandidateSelected(sourceTransactionId: string): boolean {
        return this.augmentationService.selectedCandidateIds().has(sourceTransactionId);
    }

    toggleCandidateSelection(sourceTransactionId: string): void {
        this.augmentationService.toggleCandidateTransaction(sourceTransactionId);
    }

    goToStep(index: number): void {
        this.augmentationService.goToWizardStep(index);
    }

    async acceptStep(): Promise<void> {
        await this.augmentationService.acceptCurrentStep();
    }

    skipStep(): void {
        this.augmentationService.skipCurrentStep();
    }

    dismissStep(): void {
        this.augmentationService.dismissCurrentStep();
    }

    closeWizard(): void {
        this.augmentationService.closeWizard();
    }

    openNotificationSummaryFromWizard(): void {
        this.augmentationService.returnToNotificationOnClose.set(false);
        this.augmentationService.closeWizard();
        this.augmentationService.isNotificationDialogOpen.set(true);
    }

    // --- Post-Import Notification Summary Actions ---

    getOpportunityDecision(opp: IAccountAugmentationOpportunity): AugmentationReviewDecision {
        return opp.reviewDecision ?? AugmentationReviewDecision.Skip;
    }

    setOpportunityDecision(
        opp: IAccountAugmentationOpportunity,
        decision: AugmentationReviewDecision
    ): void {
        this.augmentationService.setOpportunityReviewDecision(opp.id, decision);
    }

    setAllDecisions(decision: AugmentationReviewDecision): void {
        this.augmentationService.setAllOpportunitiesReviewDecision(decision);
    }

    async acceptAndApplyAllFromNotification(): Promise<void> {
        this.augmentationService.setAllOpportunitiesReviewDecision(
            AugmentationReviewDecision.Accept
        );
        await this.augmentationService.applyNotificationReviewDecisions();
    }

    async skipAllAndCloseNotification(): Promise<void> {
        this.augmentationService.setAllOpportunitiesReviewDecision(AugmentationReviewDecision.Skip);
        await this.augmentationService.applyNotificationReviewDecisions();
    }

    async dismissAllAndCloseNotification(): Promise<void> {
        this.augmentationService.setAllOpportunitiesReviewDecision(
            AugmentationReviewDecision.Dismiss
        );
        await this.augmentationService.applyNotificationReviewDecisions();
    }

    async applyNotificationDecisions(): Promise<void> {
        await this.augmentationService.applyNotificationReviewDecisions();
    }

    closeNotification(): void {
        this.augmentationService.closeNotificationDialog();
    }

    navigateToAccountFromNotification(accountId: string): void {
        this.augmentationService.closeNotificationDialog();
        if (this.router) {
            void this.router.navigate(['/accounts', accountId]);
        }
    }

    openWizardFromNotification(opp: IAccountAugmentationOpportunity): void {
        this.augmentationService.openReviewFromNotification(opp.id);
    }

    formatCurrency(cents: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    }
}
