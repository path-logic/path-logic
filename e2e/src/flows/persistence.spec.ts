import { expect, test } from '@playwright/test';

import { createCheckingAccount, navigateTo, waitForAppShell } from '../helpers/test-utils';

test.describe('Persistence & Navigation', () => {
    test('data persists after page refresh', async ({ page }) => {
        // Create an account
        await createCheckingAccount(page, 'Persist Account', '3000');
        await expect(page.getByText('Persist Account')).toBeVisible({ timeout: 10_000 });

        // Refresh the page
        await page.reload();
        await waitForAppShell(page);

        // Account should still be visible after reload
        await expect(page.getByText('Persist Account')).toBeVisible({ timeout: 10_000 });
    });

    test('deep-link to account ledger renders correctly', async ({ page }) => {
        // Create account to get its ID
        await createCheckingAccount(page, 'Deeplink Account', '1500');
        await page.getByText('Deeplink Account').click();

        // Capture the URL (contains the account ID)
        const accountUrl = page.url();
        expect(accountUrl).toMatch(/\/accounts\/.+/);

        // Navigate away then deep-link back
        await navigateTo(page, '/');
        await page.goto(accountUrl);
        await waitForAppShell(page);

        // Ledger should render
        await expect(
            page.locator('app-account-ledger, [data-testid="ledger"]').first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('full navigation flow: all top-level routes render', async ({ page }) => {
        const routes = [
            { path: '/', label: 'Overview' },
            { path: '/accounts', label: 'Accounts' },
            { path: '/payees', label: 'Payees' },
            { path: '/recurring', label: 'Recurring' },
        ];

        for (const route of routes) {
            await navigateTo(page, route.path);
            await waitForAppShell(page);
            // Each page should render without crashing (header stays visible)
            await expect(page.locator('app-header')).toBeVisible({ timeout: 10_000 });
        }
    });
});
