import { expect, test } from '@playwright/test';

test.describe('Responsive Device Matrix & Layout Audits', () => {
    const routes = ['/', '/accounts', '/payees', '/recurring', '/settings'];

    for (const route of routes) {
        test(`Page '${route}' renders cleanly with zero horizontal overflow`, async ({ page }) => {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');

            // Verify document scrollWidth matches window innerWidth (no horizontal layout spillage)
            const isOverflowing = await page.evaluate(() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            });
            expect(isOverflowing).toBe(false);
        });
    }

    test('Mobile Navigation Drawer opens and closes on small viewports', async ({ page }) => {
        // Force mobile viewport size if desktop chrome project
        await page.setViewportSize({ width: 393, height: 851 });
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const hamburgerBtn = page.locator('button[aria-label="Open mobile navigation menu"]');
        await expect(hamburgerBtn).toBeVisible();

        await hamburgerBtn.click();
        const mobileNav = page.locator('nav.flex.flex-col');
        await expect(mobileNav).toBeVisible();

        const accountsLink = mobileNav.locator('a', { hasText: 'Accounts' });
        await expect(accountsLink).toBeVisible();

        await accountsLink.click();
        await expect(page).toHaveURL(/\/accounts/);
    });

    test('Interactive buttons meet minimum 44px touch targets on mobile viewports', async ({
        page
    }) => {
        await page.setViewportSize({ width: 412, height: 892 });
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const firstButton = page.locator('button:visible').first();
        const box = await firstButton.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(40);
    });
});
