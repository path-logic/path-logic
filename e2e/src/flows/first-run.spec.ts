import { expect, test } from '@playwright/test';

import { createCheckingAccount, navigateTo, waitForAppShell } from '../helpers/test-utils';

test.describe('First-Run Flow', () => {
    test('cold start: app loads and shows empty dashboard', async ({ page }) => {
        await navigateTo(page, '/');
        await waitForAppShell(page);
        await expect(page).toHaveTitle(/Path Logic/i);
        // Dashboard should be visible
        await expect(page.locator('app-dashboard, [data-testid="dashboard"]').first()).toBeVisible({
            timeout: 10_000
        });
    });

    test('welcome wizard: complete new account setup via stepper', async ({ page }) => {
        await navigateTo(page, '/');
        await waitForAppShell(page);

        // If wizard is shown on first run, complete it
        const wizardEl = page.locator('app-welcome-wizard');
        const wizardVisible = await wizardEl.isVisible().catch(() => false);
        if (wizardVisible) {
            await page.getByText('Checking').click();
            await page
                .getByRole('button', { name: /Next|Continue/i })
                .first()
                .click();
            await page.getByLabel(/Account Name/i).fill('My Checking');
            await page.getByLabel(/Opening Balance/i).fill('500');
            await page.getByRole('button', { name: /Create|Finish/i }).click();
            await expect(wizardEl).toBeHidden({ timeout: 10_000 });
        }
        // Either way, the app shell is usable
        await expect(page.locator('app-header')).toBeVisible();
    });

    test('accounts page: create a checking account via dialog', async ({ page }) => {
        await createCheckingAccount(page, 'E2E Checking', '2500');
        // Account should now appear in the list
        await expect(page.getByText('E2E Checking')).toBeVisible({ timeout: 10_000 });
    });

    test('accounts page: create a loan account via dialog', async ({ page }) => {
        await navigateTo(page, '/accounts');
        await waitForAppShell(page);
        const addBtn = page.getByRole('button', { name: /New Account|Add Account/i });
        await addBtn.click();
        await expect(page.locator('p-dialog')).toBeVisible({ timeout: 5_000 });

        // Select Loan type
        await page
            .getByText(/Loan|Mortgage|Auto/i)
            .first()
            .click();
        await page
            .getByRole('button', { name: /Next|Continue/i })
            .first()
            .click();
        await page.getByLabel(/Account Name/i).fill('Car Loan');
        await page.getByRole('button', { name: /Create|Finish/i }).click();
        await expect(page.locator('p-dialog')).toBeHidden({ timeout: 10_000 });
        await expect(page.getByText('Car Loan')).toBeVisible({ timeout: 10_000 });
    });
});
