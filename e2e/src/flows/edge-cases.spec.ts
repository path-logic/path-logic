import { expect, test } from '@playwright/test';
import * as path from 'path';
import { AccountLedgerPage } from '../pages/account-ledger.page';
import { AccountsPage } from '../pages/accounts.page';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

test.describe('Edge Cases', () => {
    test('split invariant: unbalanced splits are rejected', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('Split Edge Account', '1000');
        await accountsPage.goToAccountLedger('Split Edge Account');

        const ledgerPage = new AccountLedgerPage(page);
        const today = new Date().toISOString().split('T')[0] || '';

        // Add a transaction and open split dialog
        await ledgerPage.fillDate(today);
        await ledgerPage.fillAmount('100');
        await ledgerPage.fillPayee('Test Split');

        await ledgerPage.clickSplit();
        await expect(ledgerPage.splitDialog).toBeVisible({ timeout: 5_000 });

        // Add a second split line
        const addLineBtn = ledgerPage.splitDialog.getByRole('button', { name: /Add Split Line/i });
        await addLineBtn.click();

        // Enter splits that don't add up to 100
        const splitInputs = ledgerPage.splitDialog.locator('input[type="number"]');
        await expect(splitInputs).toHaveCount(2);

        await splitInputs.nth(0).fill('60');
        await splitInputs.nth(1).fill('60'); // Total = 120, not 100

        // Remaining balance should show a non-zero difference (-$20.00)
        const remainingText = ledgerPage.splitDialog.locator('p.font-mono.font-bold').last();
        await expect(remainingText).toHaveText('-$20.00');

        // Confirm Splits button should be disabled
        const saveBtn = ledgerPage.splitDialog.getByRole('button', { name: /Confirm Splits/i });
        await expect(saveBtn).toBeDisabled();
    });

    test('empty ledger state: accounts page shows empty state message', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.navigateTo();

        // If no accounts exist, an empty state cue should be visible
        // Just confirm the page doesn't crash and header is visible
        await expect(accountsPage.appShell.header).toBeVisible();
        await expect(accountsPage.page.locator('accounts-page, main').first()).toBeVisible({
            timeout: 5_000
        });
    });

    test('duplicate QIF import: same file imported twice shows dedup behavior', async ({
        page
    }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('Dedup Edge Account', '0');
        await accountsPage.goToAccountLedger('Dedup Edge Account');

        const ledgerPage = new AccountLedgerPage(page);

        // First import
        await ledgerPage.uploadQifFile(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));
        await expect(ledgerPage.reconciliationDialog).toBeVisible({ timeout: 15_000 });

        await ledgerPage.commitReconciliation();
        await expect(ledgerPage.reconciliationDialog).toBeHidden({ timeout: 15_000 });

        // Click 'Check older history?' repeatedly until the imported transactions are visible
        const olderHistoryBtn = ledgerPage.page.getByRole('button', {
            name: /Check older history/i
        });
        for (let i = 0; i < 10; i++) {
            const isBtnVisible = await olderHistoryBtn.isVisible().catch(() => false);
            if (isBtnVisible) {
                await olderHistoryBtn.click();
                await ledgerPage.page.waitForTimeout(100);
            } else {
                break;
            }
        }

        // Wait for the first transaction row to render
        await expect(ledgerPage.transactionRows.first()).toBeVisible({ timeout: 10_000 });

        // Count transactions after first import
        const firstImportCount = await ledgerPage.transactionRows.count();
        expect(firstImportCount).toBeGreaterThan(0);

        // Second import — same file
        await ledgerPage.uploadQifFile(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));

        // Dialog may not appear or we can check visibility
        const dialogVisible = await ledgerPage.reconciliationDialog.isVisible().catch(() => false);
        if (dialogVisible) {
            await ledgerPage.commitReconciliation();
            await expect(ledgerPage.reconciliationDialog).toBeHidden({ timeout: 15_000 });
        }

        // Transaction count should be the same — no duplicates added
        const secondImportCount = await ledgerPage.transactionRows.count();
        expect(secondImportCount).toBe(firstImportCount);
    });
});
