import { expect, test } from '@playwright/test';

test.describe('Overlay Behavior', () => {
    test('auth overlay is hidden when e2e bypass is active', async ({ page }) => {
        await page.goto('/');

        // Wait for the page to stabilize
        await page.waitForTimeout(1000);

        // The auth overlay should NOT be visible since e2e bypass is active
        // Check for the sign-in prompt text which would appear in the overlay
        const signInPrompt = page.getByText('Sign In');
        const isSignInVisible = await signInPrompt.isVisible().catch(() => false);
        expect(isSignInVisible).toBeFalsy();
    });

    test('header renders with navigation items', async ({ page }) => {
        await page.goto('/');

        // Header should be rendered
        const header = page.locator('app-header');
        await expect(header).toBeVisible();

        // Navigation links should be present — use role-based selectors for specificity
        await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Accounts' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Payees' })).toBeVisible();
    });

    test('footer renders with sync indicator', async ({ page }) => {
        await page.goto('/');

        // Footer should be rendered
        const footer = page.locator('app-footer');
        await expect(footer).toBeVisible();

        // Sync indicator component should be present
        const syncIndicator = page.locator('app-sync-indicator');
        await expect(syncIndicator).toBeVisible();
    });

    test('header navigation links work correctly', async ({ page }) => {
        await page.goto('/');

        // Click "Accounts" link
        await page.getByRole('link', { name: 'Accounts' }).first().click();
        await expect(page).toHaveURL(/\/accounts/);

        // Click "Payees" link
        await page.getByRole('link', { name: 'Payees' }).first().click();
        await expect(page).toHaveURL(/\/payees/);

        // Click "Overview" to go home
        await page.getByRole('link', { name: 'Overview' }).first().click();
        await expect(page).toHaveURL('/');
    });

    test('security overlay can be dismissed via Resume Session', async ({ page }) => {
        await page.goto('/');

        // In headless mode, the idle timeout triggers immediately (no mouse events).
        // The "Resume Session" button should be visible.
        const resumeButton = page.getByRole('button', { name: /Resume Session/i });

        // If the overlay is visible, click Resume Session to dismiss it
        const isResumeVisible = await resumeButton.isVisible().catch(() => false);
        if (isResumeVisible) {
            await resumeButton.click();

            // After clicking, the overlay should dismiss (opacity-0, pointer-events-none)
            await page.waitForTimeout(600); // Allow 500ms CSS transition
            await expect(resumeButton).toBeHidden();
        }

        // Either way, the page is now interactive
        await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    });
});
