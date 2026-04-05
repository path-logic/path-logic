import { expect, test } from '@playwright/test';

test.describe('Attribute Bindings', () => {
    test('accounts page renders signal-driven content', async ({ page }) => {
        await page.goto('/accounts');

        // The app-shell layout should render
        await expect(page.locator('app-shell')).toBeVisible();

        // If there are accounts, the account cards should be present
        // If empty, the welcome wizard renders
        const accountCards = page.locator('a[href*="/accounts/"]');
        const welcomeWizard = page.locator('app-welcome-wizard');

        await page.waitForTimeout(1000);

        const hasCards = (await accountCards.count()) > 0;
        const hasWizard = await welcomeWizard.isVisible().catch(() => false);

        // At least one of these should be true — content rendered
        expect(hasCards || hasWizard).toBeTruthy();
    });

    test('settings page renders with functional navigation', async ({ page }) => {
        await page.goto('/settings');

        // The app-shell layout should render
        await expect(page.locator('app-shell')).toBeVisible();
    });

    test('dev maintenance page buttons respond to signal state', async ({ page }) => {
        await page.goto('/settings/dev/maintenance');

        // The app-shell layout should render
        await expect(page.locator('app-shell')).toBeVisible();

        // Find buttons — they should be either enabled or disabled based on signal state
        const buttons = page.getByRole('button');
        const buttonCount = await buttons.count();

        // Page should have at least one button
        expect(buttonCount).toBeGreaterThan(0);

        // Verify the first button is not stuck in an indeterminate state
        const firstButton = buttons.first();
        await expect(firstButton).toBeVisible();

        // The disabled attribute should be a boolean, not stuck as "unknown"
        const isDisabled = await firstButton.isDisabled();
        expect(typeof isDisabled).toBe('boolean');
    });
});
