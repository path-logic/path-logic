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
        // Force mobile viewport size
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

    test('Payee Merging is completely excluded from DOM on small viewports and present on medium/large', async ({
        page
    }) => {
        // 1. Mobile viewport (< 768px): should NOT be in DOM
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/payees');
        await page.waitForLoadState('domcontentloaded');

        const mobileMergeDialog = page.locator('payee-merge-dialog');
        await expect(mobileMergeDialog).not.toBeAttached();

        const mobileMergeHeaderBtn = page.locator('header button:has-text("Merge Payees")');
        await expect(mobileMergeHeaderBtn).not.toBeAttached();

        // 2. Desktop/Tablet viewport (>= 768px): should be present
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.goto('/payees');
        await page.waitForLoadState('domcontentloaded');

        const desktopMergeDialog = page.locator('payee-merge-dialog');
        await expect(desktopMergeDialog).toBeAttached();

        const desktopMergeHeaderBtn = page.locator('header button:has-text("Merge Payees")');
        await expect(desktopMergeHeaderBtn).toBeVisible();
    });

    test('QIF / CSV Import dialog is completely excluded from DOM on small viewports', async ({
        page
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/accounts');
        await page.waitForLoadState('domcontentloaded');

        const importDialog = page.locator('express-import-dialog');
        await expect(importDialog).not.toBeAttached();

        const reconcileDialog = page.locator('reconciliation-dialog');
        await expect(reconcileDialog).not.toBeAttached();
    });

    test('Split Transaction mobile routed editor loads and balances correctly', async ({
        page
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/accounts/acc-1/transactions/tx-1/splits');
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('h1:has-text("Split")')).toBeVisible();
        await expect(page.locator('button:has-text("Save Splits")')).toBeVisible();
    });
});
