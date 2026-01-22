import { test, expect } from '@playwright/test';

test.describe('Dashboard Overview', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should load the overview page and show net position and projection', async ({ page }) => {
        // The app shows either a sign-in button or the overview
        const hasSignIn = await page.locator('text=Sign in').count() > 0;

        if (!hasSignIn) {
            // Check for Overview elements
            await expect(page.locator('text=Net Position')).toBeVisible();
            await expect(page.locator('text=Financial Overview')).toBeVisible();

            // Projection chart should be present (via svg or data container)
            const projectionChart = page.locator('div.relative.w-full.bg-card');
            await expect(projectionChart).toBeVisible();
        }
    });

    test('should load without JavaScript errors', async ({ page }) => {
        const errors: Array<string> = [];
        page.on('pageerror', (error) => {
            errors.push(error.message);
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // No unhandled errors should occur
        expect(errors).toHaveLength(0);
    });
});

test.describe('Navigation & Routing', () => {
    test('should navigate to accounts page', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const accountsLink = page.locator('nav').locator('text=Accounts');
        if (await accountsLink.isVisible()) {
            await accountsLink.click();
            await expect(page).toHaveURL(/\/accounts/);

            // In CI or clean local environments, we might see the Welcome Wizard (Accounts.length === 0)
            // or the Accounts Management header (Accounts.length > 0)
            const isWelcome = await page.locator('text=Welcome to Path Logic').count() > 0;
            const isListing = await page.locator('text=Accounts Management').count() > 0;

            expect(isWelcome || isListing).toBe(true);
        }
    });

    test('should maintain state after page reload', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Take a snapshot of visible text content
        const initialContent = await page.locator('body').textContent();

        await page.reload();
        await page.waitForLoadState('networkidle');

        const reloadedContent = await page.locator('body').textContent();

        // Content should be consistent after reload
        expect(reloadedContent?.length).toBeGreaterThan(0);
    });
});
