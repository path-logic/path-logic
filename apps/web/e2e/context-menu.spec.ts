import { test, expect } from '@playwright/test';

test.describe('Context Menus', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('right-clicking an account card should show context menu', async ({ page }) => {
        // Find an account card in the sidebar
        const accountCards = page.locator('[data-slot="context-menu-trigger"]');
        const cardCount = await accountCards.count();

        if (cardCount === 0) {
            test.skip(true, 'No account cards visible - likely no accounts yet');
            return;
        }

        // Right-click the first account card
        await accountCards.first().click({ button: 'right' });

        // Context menu content should appear
        const contextMenuContent = page.locator('[data-slot="context-menu-content"]');
        await expect(contextMenuContent).toBeVisible();

        // Should have expected menu items
        await expect(page.locator('text=Edit Account')).toBeVisible();
        await expect(page.locator('text=Delete Account')).toBeVisible();
    });

    test('context menu should close when clicking outside', async ({ page }) => {
        const accountCards = page.locator('[data-slot="context-menu-trigger"]');
        const cardCount = await accountCards.count();

        if (cardCount === 0) {
            test.skip(true, 'No account cards visible');
            return;
        }

        // Open context menu
        await accountCards.first().click({ button: 'right' });

        const contextMenuContent = page.locator('[data-slot="context-menu-content"]');
        await expect(contextMenuContent).toBeVisible();

        // Click outside to close
        await page.locator('body').click({ position: { x: 10, y: 10 } });

        // Menu should be hidden
        await expect(contextMenuContent).not.toBeVisible();
    });
});
