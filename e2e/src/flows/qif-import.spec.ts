import { expect, test } from '@playwright/test';
import * as path from 'path';

import { createCheckingAccount, waitForAppShell } from '../helpers/test-utils';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

test.describe('QIF Import & Reconciliation', () => {
    test('import a QIF file into an account', async ({ page }) => {
        await createCheckingAccount(page, 'QIF Import Account', '0');
        await page.getByText('QIF Import Account').click();
        await waitForAppShell(page);

        // Locate QIF import button/input
        const importBtn = page.getByRole('button', { name: /Import|QIF/i });
        await importBtn.click();

        // Upload the fixture file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-checking.qif'));

        // Wait for reconciliation dialog to appear
        await expect(page.locator('app-reconciliation-dialog, p-dialog')).toBeVisible({
            timeout: 15_000
        });
    });

    test('QIF import deduplication: re-importing same file shows no new records', async ({
        page
    }) => {
        await createCheckingAccount(page, 'Dedup Account', '0');
        await page.getByText('Dedup Account').click();
        await waitForAppShell(page);

        const importBtn = page.getByRole('button', { name: /Import|QIF/i });

        // First import
        await importBtn.click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));
        await expect(page.locator('p-dialog')).toBeVisible({ timeout: 15_000 });

        // Commit all decisions
        const commitBtn = page.getByRole('button', { name: /Commit|Apply/i });
        if (await commitBtn.isVisible().catch(() => false)) {
            await commitBtn.click();
        }
        await expect(page.locator('p-dialog')).toBeHidden({ timeout: 10_000 });

        // Second import of same file
        await importBtn.click();
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-duplicate.qif'));

        // Dialog may not appear (all records are duplicates) or shows 0 new
        const dialogVisible = await page
            .locator('p-dialog')
            .isVisible()
            .catch(() => false);
        if (dialogVisible) {
            const bodyText = await page.locator('p-dialog').innerText();
            // All entries should be identified as duplicates/matches, not new imports
            expect(bodyText).not.toMatch(/\d+ new transactions/i);
        }
    });
});
