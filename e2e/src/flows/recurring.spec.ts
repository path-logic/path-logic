import { expect, test } from '@playwright/test';

import { createCheckingAccount, navigateTo, waitForAppShell } from '../helpers/test-utils';

test.describe('Recurring Schedules & Projection', () => {
    test('create a recurring schedule', async ({ page }) => {
        await navigateTo(page, '/recurring');
        await waitForAppShell(page);

        const addBtn = page.getByRole('button', { name: /New|Add|Create/i }).first();
        await addBtn.click();

        // Fill in the recurring form
        await page
            .getByLabel(/Name|Description/i)
            .first()
            .fill('Monthly Rent');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('-1200');

        // Save the schedule
        await page
            .getByRole('button', { name: /Save|Create/i })
            .last()
            .click();

        // Verify the schedule appears in the list
        await expect(page.getByText('Monthly Rent')).toBeVisible({ timeout: 10_000 });
    });

    test('projection chart updates after adding a recurring schedule', async ({ page }) => {
        // Set up an account first
        await createCheckingAccount(page, 'Projection Account', '5000');

        // Go to recurring and add a schedule
        await navigateTo(page, '/recurring');
        await waitForAppShell(page);
        const addBtn = page.getByRole('button', { name: /New|Add|Create/i }).first();
        await addBtn.click();
        await page
            .getByLabel(/Name|Description/i)
            .first()
            .fill('Salary');
        await page
            .getByLabel(/Amount/i)
            .first()
            .fill('3000');
        await page
            .getByRole('button', { name: /Save|Create/i })
            .last()
            .click();
        await expect(page.getByText('Salary')).toBeVisible({ timeout: 10_000 });

        // Navigate to dashboard and verify projection chart is rendered
        await navigateTo(page, '/');
        await waitForAppShell(page);
        await expect(page.locator('app-projection-chart, canvas').first()).toBeVisible({
            timeout: 10_000,
        });
    });
});
