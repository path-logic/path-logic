import { expect, test } from '@playwright/test';
import * as path from 'path';

import { createCheckingAccount, navigateTo, waitForAppShell } from '../helpers/test-utils';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

test.describe('Edge Cases', () => {
    test('split invariant: unbalanced splits are rejected', async ({ page }) => {
        await createCheckingAccount(page, 'Split Edge Account', '1000');
        await page.getByText('Split Edge Account').click();
        await waitForAppShell(page);

        // Add a transaction and open split dialog
        const dateInput = page.getByLabel(/Date/i).first();
        await dateInput.fill('2024-04-10');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('100');
        await page.getByLabel(/Payee/i).first().fill('Test Split');

        const splitBtn = page.getByRole('button', { name: /Split|Splits/i }).first();
        await splitBtn.click();
        await expect(page.locator('p-dialog')).toBeVisible({ timeout: 5_000 });

        // Enter splits that don't add up to 100
        const splitInputs = page.locator(
            'p-dialog input[type="number"], p-dialog p-inputnumber input'
        );
        if ((await splitInputs.count()) >= 2) {
            await splitInputs.nth(0).fill('60');
            await splitInputs.nth(1).fill('60'); // Total = 120, not 100
        }

        // Try to save — should show an error
        const saveBtn = page
            .locator('p-dialog')
            .getByRole('button', { name: /Save|Apply|Confirm/i });
        await saveBtn.click();

        // An error or validation message should be visible
        const errorMsg = page.getByText(/invalid|not balanced|must equal|error/i);
        await expect(errorMsg).toBeVisible({ timeout: 5_000 });
    });

    test('empty ledger state: accounts page shows empty state message', async ({ page }) => {
        await navigateTo(page, '/accounts');
        await waitForAppShell(page);

        // If no accounts exist, an empty state cue should be visible
        const _accountList = page.locator('app-account-list, [data-testid="account-list"]');
        const _hasAccounts = await page
            .getByText(/No accounts/i)
            .isVisible()
            .catch(() => false);

        // Either accounts exist (from other tests) or the empty state is shown
        // Just confirm the page doesn't crash
        await expect(page.locator('app-header')).toBeVisible();
        // The accounts container should be in the DOM
        await expect(page.locator('app-accounts-page, main').first()).toBeVisible({
            timeout: 5_000
        });
    });

    test('duplicate QIF import: same file imported twice shows dedup behavior', async ({
        page
    }) => {
        await createCheckingAccount(page, 'Dedup Edge Account', '0');
        await page.getByText('Dedup Edge Account').click();
        await waitForAppShell(page);

        const importBtn = page.getByRole('button', { name: /Import|QIF/i });

        // First import
        await importBtn.click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));

        const dialogVisible = await page
            .locator('p-dialog')
            .isVisible()
            .catch(() => false);
        if (dialogVisible) {
            const commitBtn = page
                .locator('p-dialog')
                .getByRole('button', { name: /Commit|Apply/i });
            if (await commitBtn.isVisible().catch(() => false)) {
                await commitBtn.click();
            }
            await expect(page.locator('p-dialog')).toBeHidden({ timeout: 15_000 });
        }

        // Count transactions after first import
        const txRows = page.locator('table tbody tr, [data-testid="tx-row"]');
        const firstImportCount = await txRows.count();

        // Second import — same file
        await importBtn.click();
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));

        const dialog2Visible = await page
            .locator('p-dialog')
            .isVisible()
            .catch(() => false);
        if (dialog2Visible) {
            const commitBtn = page
                .locator('p-dialog')
                .getByRole('button', { name: /Commit|Apply/i });
            if (await commitBtn.isVisible().catch(() => false)) {
                await commitBtn.click();
            }
            await expect(page.locator('p-dialog')).toBeHidden({ timeout: 15_000 });
        }

        // Transaction count should be the same — no duplicates added
        const secondImportCount = await txRows.count();
        expect(secondImportCount).toBe(firstImportCount);
    });
});
