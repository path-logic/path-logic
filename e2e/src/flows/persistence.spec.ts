import { expect, test } from '@playwright/test';
import { AccountLedgerPage } from '../pages/account-ledger.page';
import { AccountsPage } from '../pages/accounts.page';

test.describe('Persistence & Navigation', () => {
    test('data persists after page refresh', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        // Create an account
        await accountsPage.createCheckingAccount('Persist Account', '3000');
        await expect(accountsPage.page.getByText('Persist Account')).toBeVisible({
            timeout: 10_000
        });

        // Refresh the page
        await accountsPage.page.reload();
        await accountsPage.appShell.waitForAppShell();

        // Account should still be visible after reload
        await expect(accountsPage.page.getByText('Persist Account')).toBeVisible({
            timeout: 10_000
        });
    });

    test('deep-link to account ledger renders correctly', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        // Create account to get its ID
        await accountsPage.createCheckingAccount('Deeplink Account', '3000');
        await accountsPage.goToAccountLedger('Deeplink Account');

        // Capture the URL (contains the account ID)
        const accountUrl = accountsPage.page.url();
        expect(accountUrl).toMatch(/\/accounts\/.+/);

        // Navigate away then deep-link back
        await accountsPage.appShell.navigateTo('/');
        await accountsPage.page.goto(accountUrl);
        await accountsPage.appShell.waitForAppShell();

        // Ledger should render
        const ledgerPage = new AccountLedgerPage(page);
        await expect(
            ledgerPage.page.locator('account-ledger, [data-testid="ledger"]').first()
        ).toBeVisible({
            timeout: 10_000
        });
    });

    test('full navigation flow: all top-level routes render', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        const routes = ['/', '/accounts', '/payees', '/recurring'];

        for (const path of routes) {
            await accountsPage.appShell.navigateTo(path);
            await accountsPage.appShell.waitForAppShell();
            // Each page should render without crashing (header stays visible)
            await expect(accountsPage.appShell.header).toBeVisible({ timeout: 10_000 });
        }
    });
});
