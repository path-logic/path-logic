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

    test('header/sidebar renders with navigation items', async ({ page }) => {
        await page.goto('/');

        const isDesktop = (page.viewportSize()?.width ?? 1280) >= 1024;
        if (isDesktop) {
            await expect(page.locator('sidebar-nav')).toBeVisible();
        } else {
            await expect(page.locator('.app-header')).toBeVisible();
        }

        // Navigation links should be present — use role-based selectors for specificity
        await expect(page.getByRole('link', { name: /Overview/ }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /Accounts/ }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /Payees/ }).first()).toBeVisible();
    });

    test('footer/sidebar renders with sync indicator', async ({ page }) => {
        await page.goto('/');

        // Sync indicator component should be present (in footer on mobile, sidebar on desktop)
        const syncIndicator = page.locator('sync-indicator').first();
        await expect(syncIndicator).toBeVisible();
    });

    test('header navigation links work correctly', async ({ page }) => {
        await page.goto('/');

        // Click "Accounts" link
        await page
            .getByRole('link', { name: /Accounts/ })
            .first()
            .click();
        await expect(page).toHaveURL(/\/accounts/);

        // Click "Payees" link
        await page
            .getByRole('link', { name: /Payees/ })
            .first()
            .click();
        await expect(page).toHaveURL(/\/payees/);

        // Click "Overview" to go home
        await page
            .getByRole('link', { name: /Overview/ })
            .first()
            .click();
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
        await expect(page.getByRole('link', { name: /Overview/ }).first()).toBeVisible();
    });
});
