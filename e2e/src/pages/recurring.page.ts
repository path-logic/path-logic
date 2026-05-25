import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AppShellPage } from './app-shell.page';

export class RecurringPage {
    readonly page: Page;
    readonly appShell: AppShellPage;

    readonly addBtn;
    readonly nameInput;
    readonly amountInput;
    readonly saveBtn;

    constructor(page: Page) {
        this.page = page;
        this.appShell = new AppShellPage(page);

        this.addBtn = page.getByRole('button', { name: /New|Add|Create/i }).first();
        this.nameInput = page.getByLabel(/Name|Description/i).first();
        this.amountInput = page.getByLabel(/Amount/i).first();
        this.saveBtn = page.getByRole('button', { name: /Save|Create/i }).last();
    }

    async navigateTo(): Promise<void> {
        await this.appShell.navigateTo('/recurring');
        await this.appShell.waitForAppShell();
    }

    async selectAccount(accountName: string): Promise<void> {
        const dropdown = this.page.locator('[inputId="recurring-account"]').first();
        await dropdown.click();
        const overlay = this.page.getByRole('listbox');
        await expect(overlay).toBeVisible();
        await overlay.getByRole('option', { name: accountName, exact: true }).first().click();
        await expect(overlay).toBeHidden();
    }

    async createRecurringSchedule(
        name: string,
        amount: string,
        accountName: string
    ): Promise<void> {
        await this.navigateTo();
        await this.addBtn.click();
        await this.nameInput.fill(name);
        await this.amountInput.fill(amount);
        await this.selectAccount(accountName);
        await this.saveBtn.click();
    }
}
