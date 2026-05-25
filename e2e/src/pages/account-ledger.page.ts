import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage } from './app-shell.page';

export class AccountLedgerPage {
    readonly page: Page;
    readonly appShell: AppShellPage;

    // Form fields
    readonly dateInput;
    readonly payeeInput;
    readonly amountInput;
    readonly categoryInput;
    readonly memoInput;
    readonly numberInput;
    readonly cancelBtn;
    readonly enterBtn;

    // Ledger elements
    readonly transactionRows;

    readonly splitBtn;
    readonly splitDialog;

    readonly importBtn;
    readonly fileInput;
    readonly reconciliationDialog;
    readonly commitBtn;

    constructor(page: Page) {
        this.page = page;
        this.appShell = new AppShellPage(page);

        // Inputs scoped to transaction-entry-form
        const form = page.locator('transaction-entry-form');
        this.dateInput = form.getByLabel(/Date/i).first();
        this.payeeInput = form.getByLabel(/Pay To|Rcvd From|Payee/i).first();
        this.amountInput = form.getByLabel(/Amount/i).first();
        this.categoryInput = form.getByLabel(/Category/i).first();
        this.memoInput = form.getByLabel(/Memo/i).first();
        this.numberInput = form.getByLabel(/Number|Check/i).first();

        // Buttons
        this.cancelBtn = form.getByRole('button', { name: /Cancel/i }).first();
        this.enterBtn = form.getByRole('button', { name: /Enter|Add|Save/i }).first();
        this.splitBtn = form.getByRole('button', { name: /Split|Splits/i }).first();

        // Split dialog
        this.splitDialog = page.locator('.split-entry-dialog');

        // QIF import elements
        this.importBtn = page.getByRole('button', { name: /Import QIF/i });
        this.fileInput = page.locator('input[type="file"]');
        this.reconciliationDialog = page.locator('.reconciliation-dialog');
        this.commitBtn = page.getByRole('button', { name: /Commit|Apply/i });

        // Ledger table row locator
        this.transactionRows = page.locator('transaction-table div[role="button"]');
    }

    async navigateTo(accountId: string): Promise<void> {
        if (this.page.url().endsWith(`/accounts/${accountId}`)) {
            return;
        }
        await this.appShell.navigateTo(`/accounts/${accountId}`);
        await this.appShell.waitForAppShell();
    }

    async fillDate(date: string): Promise<void> {
        await this.dateInput.fill(date);
    }

    async fillPayee(payee: string): Promise<void> {
        await this.payeeInput.fill(payee);
        const listbox = this.page.getByRole('listbox');
        await expect(listbox).toBeVisible({ timeout: 5000 });
        await this.payeeInput.press('ArrowDown');
        await this.payeeInput.press('Enter');
        await expect(listbox).toBeHidden({ timeout: 5000 });
    }

    async fillAmount(amount: string): Promise<void> {
        await this.amountInput.fill(amount);
        await this.amountInput.press('Tab');
    }

    async fillCategory(category: string): Promise<void> {
        await this.categoryInput.fill(category);
        const listbox = this.page.getByRole('listbox');
        await expect(listbox).toBeVisible({ timeout: 5000 });
        await this.categoryInput.press('ArrowDown');
        await this.categoryInput.press('Enter');
        await expect(listbox).toBeHidden({ timeout: 5000 });
    }

    async fillMemo(memo: string): Promise<void> {
        await this.memoInput.fill(memo);
    }

    async fillNumber(num: string): Promise<void> {
        await this.numberInput.fill(num);
    }

    async clickEnter(): Promise<void> {
        await this.enterBtn.click();
    }

    async clickCancel(): Promise<void> {
        await this.cancelBtn.click();
    }

    async addSimpleTransaction(
        date: string,
        payee: string,
        amount: string,
        category?: string,
        memo?: string
    ): Promise<void> {
        await this.fillDate(date);
        await this.fillPayee(payee);
        await this.fillAmount(amount);
        if (category) {
            await this.fillCategory(category);
        }
        if (memo) {
            await this.fillMemo(memo);
        }
        await this.clickEnter();
    }

    async clickSplit(): Promise<void> {
        await this.splitBtn.click();
    }

    async deleteTransaction(payee: string): Promise<void> {
        const row = await this.getRowByPayee(payee);
        const deleteBtn = row.getByRole('button', { name: /Delete|Remove/i });
        await deleteBtn.click();

        const confirmBtn = this.page.getByRole('button', { name: /Confirm|Yes|OK/i });
        if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
        }
    }

    async getRowByPayee(payee: string): Promise<Locator> {
        return this.page
            .getByText(payee)
            .locator('xpath=ancestor::div[@role="button" or contains(@class, "group/row")]')
            .first();
    }

    async uploadQifFile(filePath: string): Promise<void> {
        await this.importBtn.click();
        await this.fileInput.setInputFiles(filePath);
    }

    async commitReconciliation(): Promise<void> {
        await this.commitBtn.click();
    }
}
