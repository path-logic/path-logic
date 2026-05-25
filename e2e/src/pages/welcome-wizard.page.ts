import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class WelcomeWizardPage {
    readonly page: Page;
    readonly container;
    readonly accountNameInput;
    readonly initialBalanceInput;
    readonly createAccountOnlyBtn;
    readonly createAndImportBtn;
    readonly skipImportBtn;
    readonly finishImportBtn;

    constructor(page: Page) {
        this.page = page;
        this.container = page.locator('welcome-wizard');
        this.accountNameInput = this.container.getByLabel(/Account Name/i);
        this.initialBalanceInput = this.container.getByLabel(/Initial Balance/i);
        this.createAccountOnlyBtn = this.container.getByRole('button', {
            name: /Create Account Only/i
        });
        this.createAndImportBtn = this.container.getByRole('button', {
            name: /Create & Import Data/i
        });
        this.skipImportBtn = this.container.getByRole('button', { name: /Skip for now/i });
        this.finishImportBtn = this.container.getByRole('button', { name: /Go to Ledger/i });
    }

    async isVisible(): Promise<boolean> {
        return this.container.isVisible().catch(() => false);
    }

    async selectType(type: string): Promise<void> {
        const label = type === 'Checking' || type === 'Savings' ? `${type} Account` : type;
        await this.container.getByText(label, { exact: true }).click();
    }

    async fillDetails(name: string, balance?: string): Promise<void> {
        await this.accountNameInput.fill(name);
        if (balance) {
            await this.initialBalanceInput.fill(balance);
        }
    }

    async clickCreateAccountOnly(): Promise<void> {
        await this.createAccountOnlyBtn.click();
    }

    async clickCreateAndImport(): Promise<void> {
        await this.createAndImportBtn.click();
    }

    async completeOnboardingChecking(name: string, balance: string = '1000'): Promise<void> {
        const loadingState = this.page.getByText(/Loading your data/i);
        await expect(loadingState).toBeHidden({ timeout: 15_000 });

        const pageReadyElement = this.page
            .locator(
                'welcome-wizard, button:has-text("Add Account"), button:has-text("New Account")'
            )
            .first();
        await expect(pageReadyElement).toBeVisible({ timeout: 10_000 });

        if (await this.isVisible()) {
            await this.selectType('Checking');
            await this.fillDetails(name, balance);
            await this.clickCreateAccountOnly();
            await expect(this.container).toBeHidden({ timeout: 10_000 });
        }
    }
}
