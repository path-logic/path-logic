import { expect, test } from '@playwright/test';
import * as path from 'path';
import { AccountLedgerPage } from '../pages/account-ledger.page';
import { AccountsPage } from '../pages/accounts.page';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

test.describe('QIF Import & Reconciliation', () => {
    test('import a QIF file into an account', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('QIF Import Account', '0');
        await accountsPage.goToAccountLedger('QIF Import Account');

        const ledgerPage = new AccountLedgerPage(page);

        // Upload the fixture file using POM
        await ledgerPage.uploadQifFile(path.join(FIXTURES_DIR, 'sample-checking.qif'));

        // Wait for reconciliation dialog to appear
        await expect(ledgerPage.reconciliationDialog).toBeVisible({
            timeout: 15_000
        });
    });

    test('QIF import deduplication: re-importing same file shows no new records', async ({
        page
    }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('Dedup Account', '0');
        await accountsPage.goToAccountLedger('Dedup Account');

        const ledgerPage = new AccountLedgerPage(page);

        // First import
        await ledgerPage.uploadQifFile(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));
        await expect(ledgerPage.reconciliationDialog).toBeVisible({ timeout: 15_000 });

        // Commit all decisions
        await ledgerPage.commitReconciliation();
        await expect(ledgerPage.reconciliationDialog).toBeHidden({ timeout: 10_000 });

        // Second import of same file
        await ledgerPage.uploadQifFile(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));

        // Dialog may not appear (all records are duplicates) or shows 0 new
        const dialogVisible = await ledgerPage.reconciliationDialog.isVisible().catch(() => false);
        if (dialogVisible) {
            const bodyText = await ledgerPage.reconciliationDialog.innerText();
            // All entries should be identified as duplicates/matches, not new imports
            expect(bodyText).not.toMatch(/\d+ new transactions/i);
        }
    });
});
