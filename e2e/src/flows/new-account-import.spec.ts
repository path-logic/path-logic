import { expect, test } from '@playwright/test';
import * as path from 'path';
import { AccountsPage } from '../pages/accounts.page';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');
const PETER_QIF = path.resolve(__dirname, '../../../qif-results/test-data/Peter.qif');

test.describe('New Account Import Reproduction', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message, err.stack));
    });

    test('reproduce import in new account dialog with sample-checking.qif', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.navigateTo();
        await accountsPage.welcomeWizard.completeOnboardingChecking('Initial Checking', '1000');
        await accountsPage.openNewAccountDialog();

        // Step 1: Select Checking
        await accountsPage.selectType('Checking');

        // Step 2: Name and Create & Import
        await accountsPage.accountNameInput.fill('Repro Checking Small');
        const createAndImportBtn = accountsPage.dialog.getByRole('button', {
            name: /Create & Import/i
        });
        await createAndImportBtn.click();

        // Step 3: Wait for drop zone / file input
        const fileInput = accountsPage.dialog.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();

        console.log('--- Uploading sample-checking.qif ---');
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-checking.qif'));

        await expect(accountsPage.dialog.getByText('Import Ready!')).toBeVisible({
            timeout: 10_000
        });
        await expect(
            accountsPage.dialog.getByText(/transactions parsed and ready to review/i)
        ).toBeVisible();

        const goToLedgerBtn = accountsPage.dialog.getByRole('button', { name: /Go to Ledger/i });
        await expect(goToLedgerBtn).toBeVisible();
        await goToLedgerBtn.click();

        await expect(page).toHaveURL(/\/accounts\/acc-/);
        await expect(accountsPage.dialog).toBeHidden({ timeout: 5_000 });
    });

    test('reproduce import in new account dialog with Peter.qif (large)', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.navigateTo();
        await accountsPage.welcomeWizard.completeOnboardingChecking('Initial Checking', '1000');
        await accountsPage.openNewAccountDialog();

        // Step 1: Select Checking
        await accountsPage.selectType('Checking');

        // Step 2: Name and Create & Import
        await accountsPage.accountNameInput.fill('Repro Checking Large');
        const createAndImportBtn = accountsPage.dialog.getByRole('button', {
            name: /Create & Import/i
        });
        await createAndImportBtn.click();

        // Step 3: Wait for drop zone / file input
        const fileInput = accountsPage.dialog.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();

        console.log('--- Uploading Peter.qif ---');
        await fileInput.setInputFiles(PETER_QIF);

        await expect(accountsPage.dialog.getByText('Import Ready!')).toBeVisible({
            timeout: 20_000
        });
        await expect(
            accountsPage.dialog.getByText(/7,912 transactions parsed and ready to review/i)
        ).toBeVisible();

        const goToLedgerBtn = accountsPage.dialog.getByRole('button', { name: /Go to Ledger/i });
        await expect(goToLedgerBtn).toBeVisible();
        await goToLedgerBtn.click();

        await expect(page).toHaveURL(/\/accounts\/acc-/);
        await expect(accountsPage.dialog).toBeHidden({ timeout: 5_000 });
    });
});
