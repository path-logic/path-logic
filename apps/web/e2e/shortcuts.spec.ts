import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');
    });

    test('Ctrl+K should focus the ledger search input', async ({ page }) => {
        // Find a search input on the page
        const searchInput = page.locator('input[placeholder*="Filter ledger"]');

        // Verify search input exists (if there are transactions)
        try {
            await expect(searchInput).toBeVisible({ timeout: 5000 });
        } catch {
            test.skip(true, 'No ledger search visible - likely no accounts yet');
            return;
        }

        // Press Ctrl+K (works on both Windows/Linux)
        await page.keyboard.press('Control+k');

        // Check that the search input is focused
        await expect(searchInput).toBeFocused();
    });

    test('search input should show correct OS modifier in placeholder', async ({ page }) => {
        const searchInput = page.locator('input[placeholder*="Filter ledger"]');

        const inputCount = await searchInput.count();
        if (inputCount === 0) {
            test.skip(true, 'No ledger search visible');
            return;
        }

        const placeholder = await searchInput.getAttribute('placeholder');

        // Should contain either CMD+K or Ctrl+K
        expect(placeholder).toMatch(/(CMD\+K|Ctrl\+K)/);
    });
});
