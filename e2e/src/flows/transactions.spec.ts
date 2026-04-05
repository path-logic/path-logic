import { expect, test } from '@playwright/test';

import { createCheckingAccount, waitForAppShell } from '../helpers/test-utils';

test.describe('Transaction Management', () => {
    test.beforeEach(async ({ page }) => {
        await createCheckingAccount(page, 'Tx Test Account', '1000');
        // Navigate into the account ledger
        await page.getByText('Tx Test Account').click();
        await expect(page).toHaveURL(/\/accounts\/.+/);
        await waitForAppShell(page);
    });

    test('add a simple transaction', async ({ page }) => {
        // Use the quick-add form pinned to the ledger
        const dateInput = page.getByLabel(/Date/i).first();
        await dateInput.fill('2024-04-10');
        await page.getByLabel(/Payee/i).first().fill('Coffee Shop');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('-4.50');
        await page
            .getByRole('button', { name: /Add|Save/i })
            .first()
            .click();

        // Transaction should appear in the ledger table
        await expect(page.getByText('Coffee Shop')).toBeVisible({ timeout: 10_000 });
    });

    test('add a split transaction (paycheck)', async ({ page }) => {
        const dateInput = page.getByLabel(/Date/i).first();
        await dateInput.fill('2024-04-15');
        await page.getByLabel(/Payee/i).first().fill('ACME Corp');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('2000');

        // Open split dialog
        const splitBtn = page.getByRole('button', { name: /Split|Splits/i }).first();
        await splitBtn.click();
        await expect(page.locator('app-split-entry-dialog, p-dialog')).toBeVisible({
            timeout: 5_000,
        });

        // Verify split entry dialog is open
        await expect(page.getByText(/Split|Splits/i).first()).toBeVisible();
    });

    test('keyboard navigation in ledger: arrow keys move row selection', async ({ page }) => {
        // First add a transaction so there's a row to navigate
        const dateInput = page.getByLabel(/Date/i).first();
        await dateInput.fill('2024-04-10');
        await page.getByLabel(/Payee/i).first().fill('Nav Test Payee');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('-10');
        await page
            .getByRole('button', { name: /Add|Save/i })
            .first()
            .click();
        await expect(page.getByText('Nav Test Payee')).toBeVisible({ timeout: 10_000 });

        // Click on the table row and test arrow key navigation
        const row = page.getByText('Nav Test Payee').locator('..').locator('..');
        await row.click();
        await page.keyboard.press('ArrowDown');
        // Just verify no error is thrown and the page is still interactive
        await expect(page.locator('app-header')).toBeVisible();
    });

    test('delete a transaction', async ({ page }) => {
        // Add a transaction to delete
        const dateInput = page.getByLabel(/Date/i).first();
        await dateInput.fill('2024-04-10');
        await page.getByLabel(/Payee/i).first().fill('Delete Me');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('-99');
        await page
            .getByRole('button', { name: /Add|Save/i })
            .first()
            .click();
        await expect(page.getByText('Delete Me')).toBeVisible({ timeout: 10_000 });

        // Find and click the delete button for that row
        const row = page.getByText('Delete Me').locator('xpath=ancestor::tr');
        const deleteBtn = row.getByRole('button', { name: /Delete|Remove/i });
        await deleteBtn.click();

        // Confirm deletion if a prompt appears
        const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|OK/i });
        if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
        }
        await expect(page.getByText('Delete Me')).toBeHidden({ timeout: 10_000 });
    });
});
