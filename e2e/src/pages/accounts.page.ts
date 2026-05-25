import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AppShellPage } from './app-shell.page';
import { WelcomeWizardPage } from './welcome-wizard.page';

export class AccountsPage {
    readonly page: Page;
    readonly appShell: AppShellPage;
    readonly welcomeWizard: WelcomeWizardPage;

    readonly addAccountBtn;
    readonly dialog;

    // Dialog Inputs & Stepper
    readonly accountNameInput;
    readonly startingBalanceInput;
    readonly createAccountOnlyBtn;
    readonly loanLiabilityTypesBtn;

    // Loan Details Form Inputs
    readonly originalLoanAmountInput;
    readonly interestRateInput;
    readonly termMonthsInput;
    readonly monthlyPaymentInput;
    readonly createLoanAccountBtn;

    constructor(page: Page) {
        this.page = page;
        this.appShell = new AppShellPage(page);
        this.welcomeWizard = new WelcomeWizardPage(page);

        this.addAccountBtn = page.getByRole('button', { name: /New Account|Add Account/i });
        this.dialog = page.locator('.new-account-dialog');

        // Dialog Controls
        this.accountNameInput = this.dialog.getByLabel(/Account Name/i);
        this.startingBalanceInput = this.dialog.getByLabel(/Starting Balance/i);
        this.createAccountOnlyBtn = this.dialog.getByRole('button', {
            name: /Create Account Only/i
        });
        this.loanLiabilityTypesBtn = this.dialog.getByRole('button', {
            name: /Loan \/ Liability Types/i
        });

        // Loan Form Controls
        this.originalLoanAmountInput = this.dialog.getByLabel(/Original Loan Amount/i);
        this.interestRateInput = this.dialog.getByLabel(/Interest Rate/i);
        this.termMonthsInput = this.dialog.getByLabel(/Term/i);
        this.monthlyPaymentInput = this.dialog.getByLabel(/Monthly Payment/i);
        this.createLoanAccountBtn = this.dialog.getByRole('button', {
            name: /Create Loan Account/i
        });
    }

    async navigateTo(): Promise<void> {
        if (this.page.url().endsWith('/accounts')) {
            return;
        }
        await this.appShell.navigateTo('/accounts');
        await this.appShell.waitForAppShell();
    }

    async openNewAccountDialog(): Promise<void> {
        await this.navigateTo();
        const loadingState = this.page.getByText(/Loading your data/i);
        await expect(loadingState).toBeHidden({ timeout: 15_000 });
        await this.addAccountBtn.click();
        await expect(this.dialog).toBeVisible({ timeout: 5_000 });
    }

    async selectType(type: string): Promise<void> {
        await this.dialog.getByText(type, { exact: true }).click();
    }

    async createCheckingAccount(name: string, balance: string = '1000'): Promise<void> {
        await this.navigateTo();
        await this.welcomeWizard.completeOnboardingChecking('Initial Checking', '1000');
        await this.openNewAccountDialog();

        // Step 1: select type (goes to step 2 automatically)
        await this.selectType('Checking');

        // Step 2: fill details & create
        await this.accountNameInput.fill(name);
        await this.startingBalanceInput.fill(balance);
        await this.createAccountOnlyBtn.click();

        await expect(this.dialog).toBeHidden({ timeout: 10_000 });
    }

    async createLoanAccount(
        name: string,
        amount: string,
        interestRate: string,
        term: string,
        payment: string
    ): Promise<void> {
        await this.navigateTo();
        await this.welcomeWizard.completeOnboardingChecking('Initial Checking', '1000');
        await this.openNewAccountDialog();

        // Step 1: select loan type
        await this.loanLiabilityTypesBtn.click();
        await this.selectType('Auto Loan'); // clicks Auto Loan button

        // Step 2: fill details & create
        await this.accountNameInput.fill(name);
        await this.originalLoanAmountInput.fill(amount);
        await this.interestRateInput.fill(interestRate);
        await this.termMonthsInput.fill(term);
        await this.monthlyPaymentInput.fill(payment);
        await this.createLoanAccountBtn.click();

        await expect(this.dialog).toBeHidden({ timeout: 10_000 });
    }

    async goToAccountLedger(name: string): Promise<void> {
        await this.navigateTo();
        const row = this.page.locator('.transition-all', { hasText: name });
        // Expand the card
        await row.getByText(name).click();
        // Click the View Ledger button
        await row.getByRole('link', { name: /View Ledger/i }).click();
        // Wait for page transition
        await expect(this.page).toHaveURL(/\/accounts\/.+/);
        await this.appShell.waitForAppShell();
    }
}
