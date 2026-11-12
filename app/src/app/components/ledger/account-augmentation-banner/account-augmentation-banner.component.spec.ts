import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    AccountType,
    TransactionStatus,
    type IAccount,
    type ISODateString,
    type ITransaction
} from '../../../core/domain/types';
import {
    AccountAugmentationService,
    AugmentationReviewDecision
} from '../../../services/import-export/account-augmentation.service';
import { LedgerStore } from '../../../services/ledger-store/ledger.store';
import { AccountAugmentationBannerComponent } from './account-augmentation-banner.component';

describe('AccountAugmentationBannerComponent', () => {
    let fixture: ComponentFixture<AccountAugmentationBannerComponent>;
    let component: AccountAugmentationBannerComponent;
    let augmentationService: AccountAugmentationService;

    const checkingAccount: IAccount = {
        id: 'acct-checking',
        name: 'Chase Checking',
        type: AccountType.Checking,
        institutionName: 'Chase',
        clearedBalance: 420000,
        pendingBalance: 420000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    const autoLoanAccount: IAccount = {
        id: 'acct-auto',
        name: 'Subaru Auto Loan',
        type: AccountType.AutoLoan,
        institutionName: 'Chase Auto',
        clearedBalance: -1800000,
        pendingBalance: -1800000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-01-01T00:00:00.000Z' as ISODateString,
        deletedAt: null
    };

    const reconciledTransferTx: ITransaction = {
        id: 'tx-transfer-1',
        accountId: 'acct-checking',
        payeeId: 'payee-1',
        payee: 'Payment to Subaru Auto Loan',
        date: '2026-10-20' as ISODateString,
        memo: '[Subaru Auto Loan]',
        totalAmount: -52500,
        status: TransactionStatus.Reconciled,
        splits: [{ id: 's-1', categoryId: null, memo: '', amount: -52500 }],
        checkNumber: null,
        importHash: 'hash-transfer-1',
        createdAt: '2026-10-20T00:00:00.000Z' as ISODateString,
        updatedAt: '2026-10-20T00:00:00.000Z' as ISODateString
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountAugmentationBannerComponent],
            providers: [AccountAugmentationService, LedgerStore, provideNoopAnimations()]
        }).compileComponents();

        augmentationService = TestBed.inject(AccountAugmentationService);
        augmentationService.analyzeLedgerAccounts(
            [checkingAccount, autoLoanAccount],
            [reconciledTransferTx],
            false
        );

        fixture = TestBed.createComponent(AccountAugmentationBannerComponent);
        component = fixture.componentInstance;
    });

    it('renders the destination augmentation banner in the affected account ledger and opens the single-step wizard', () => {
        fixture.componentRef.setInput('accountId', 'acct-auto');
        fixture.detectChanges();

        const destBanner = fixture.nativeElement.querySelector(
            '[data-testid="destination-augmentation-banner"]'
        );
        expect(destBanner).toBeTruthy();
        expect(destBanner.textContent).toContain('Chase Checking');

        const reviewBtn = fixture.nativeElement.querySelector(
            '[data-testid="destination-banner-review-btn"]'
        ) as HTMLButtonElement;
        reviewBtn.click();
        fixture.detectChanges();

        expect(augmentationService.isWizardOpen()).toBe(true);
        expect(component.wizardOpportunities().length).toBe(1);
    });

    it('renders the source extraction banner in the source account ledger listing <= 2 target accounts and supports dismissal', () => {
        fixture.componentRef.setInput('accountId', 'acct-checking');
        fixture.detectChanges();

        const sourceBanner = fixture.nativeElement.querySelector(
            '[data-testid="source-augmentation-banner"]'
        );
        expect(sourceBanner).toBeTruthy();
        expect(sourceBanner.textContent).toContain('Subaru Auto Loan');

        const dismissBtn = fixture.nativeElement.querySelector(
            '[data-testid="source-banner-dismiss-btn"]'
        ) as HTMLButtonElement;
        dismissBtn.click();
        fixture.detectChanges();

        const afterDismiss = fixture.nativeElement.querySelector(
            '[data-testid="source-augmentation-banner"]'
        );
        expect(afterDismiss).toBeNull();
    });

    it('supports recording individual review decisions and returning to the summary dialog, plus bulk actions', async () => {
        augmentationService.isNotificationDialogOpen.set(true);
        fixture.detectChanges();

        const initialOpp = augmentationService.intelligenceReport()!.opportunities[0]!;
        const oppId = initialOpp.id;
        expect(component.getOpportunityDecision(initialOpp)).toBe(AugmentationReviewDecision.Skip);

        component.openWizardFromNotification(initialOpp);
        expect(augmentationService.isWizardOpen()).toBe(true);
        expect(augmentationService.isNotificationDialogOpen()).toBe(false);

        await component.acceptStep();
        expect(augmentationService.isWizardOpen()).toBe(false);
        expect(augmentationService.isNotificationDialogOpen()).toBe(true);

        const acceptedOpp = augmentationService
            .intelligenceReport()!
            .opportunities.find(o => o.id === oppId)!;
        expect(component.getOpportunityDecision(acceptedOpp)).toBe(
            AugmentationReviewDecision.Accept
        );

        component.setAllDecisions(AugmentationReviewDecision.Dismiss);
        const dismissedOpp = augmentationService
            .intelligenceReport()!
            .opportunities.find(o => o.id === oppId)!;
        expect(component.getOpportunityDecision(dismissedOpp)).toBe(
            AugmentationReviewDecision.Dismiss
        );
    });
});
