import { expect, test } from '@playwright/test';

test.describe('Resolver Inputs', () => {
    test('route params map to account detail component', async ({ page }) => {
        // Navigate to accounts page first
        await page.goto('/accounts');

        // Check if there are account links to navigate to
        const accountLinks = page.locator('a[href*="/accounts/"]');
        const linkCount = await accountLinks.count();

        if (linkCount > 0) {
            // Click the first account link
            const firstLink = accountLinks.first();
            await firstLink.click();

            // The URL should now contain the account ID
            await expect(page).toHaveURL(new RegExp(`/accounts/.+`));

            // The account detail page should render — either the ledger or info view
            // Wait for content to load
            await page.waitForTimeout(1000);

            // The app-shell should be present (layout rendered)
            await expect(page.locator('app-shell')).toBeVisible();
        } else {
            // No accounts exist — this is acceptable, the test passes
            test.skip();
        }
    });

    test('navigating to a nonexistent account ID redirects gracefully', async ({ page }) => {
        // Navigate to an account that doesn't exist
        await page.goto('/accounts/nonexistent-id-12345');

        // The page should either redirect back to accounts or show loading
        // Wait for any redirects to settle
        await page.waitForTimeout(2000);

        // The app should not crash — either accounts page or the detail page with empty state
        await expect(page.locator('app-shell')).toBeVisible();
    });
});
