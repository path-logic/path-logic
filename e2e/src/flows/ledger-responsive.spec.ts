import { expect, test } from '@playwright/test';

test.describe('Account Ledger Responsive & Fast-Entry Verification', () => {
    test('Mobile view renders streamlined stream and opens fast-entry sheet and split dialog', async ({
        page
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/accounts/acc-mock-checking');
        await page.waitForLoadState('domcontentloaded');

        const resumeBtn = page.getByRole('button', { name: /Resume Session/i });
        if (await resumeBtn.isVisible()) {
            await resumeBtn.click();
        }

        // Check for horizontal overflow
        const isOverflowing = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(isOverflowing).toBe(false);

        // Capture mobile stream view screenshot
        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_mobile.png'
        });

        // Floating Add Transaction button
        const addBtn = page.getByRole('button', { name: /Add Transaction/i });
        await expect(addBtn).toBeVisible();

        await addBtn.click();

        // Verify sheet is open
        const headerTitle = page.getByText(/New Transaction/i);
        await expect(headerTitle).toBeVisible();

        // Capture mobile fast-entry sheet screenshot (flush to bottom)
        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_mobile_sheet.png'
        });

        // Open Split Dialog on Mobile
        const splitBtn = page.getByRole('button', { name: /Split/i });
        await expect(splitBtn).toBeVisible();
        await splitBtn.click();

        // Verify split dialog is open
        const splitHeader = page.getByText(/Split Transaction/i);
        await expect(splitHeader).toBeVisible();

        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_mobile_split.png'
        });
    });

    test('Tablet Portrait renders toolbar and table with no spillage', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/accounts/acc-mock-checking');
        await page.waitForLoadState('domcontentloaded');

        const resumeBtn = page.getByRole('button', { name: /Resume Session/i });
        if (await resumeBtn.isVisible()) {
            await resumeBtn.click();
        }

        const isOverflowing = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(isOverflowing).toBe(false);

        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_tablet_portrait.png'
        });
    });

    test('Desktop view renders dual-pane workspace with sidebar and checkbook dock', async ({
        page
    }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/accounts/acc-mock-checking');
        await page.waitForLoadState('domcontentloaded');

        const resumeBtn = page.getByRole('button', { name: /Resume Session/i });
        if (await resumeBtn.isVisible()) {
            await resumeBtn.click();
        }

        const isOverflowing = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(isOverflowing).toBe(false);

        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_desktop.png'
        });
    });

    test('Mobile navigation menu opens as an overlay without displacing layout flow', async ({
        page
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/accounts');
        await page.waitForLoadState('domcontentloaded');

        const menuBtn = page.getByRole('button', { name: /Open mobile navigation menu/i });
        await expect(menuBtn).toBeVisible();

        // Get bounding box of the main content before opening menu
        const mainContent = page.locator('main');
        const boxBefore = await mainContent.boundingBox();

        // Open mobile navigation menu
        await menuBtn.click();

        // Verify overlay and navigation links are visible
        const overviewLink = page.getByRole('link', { name: /Overview/i });
        await expect(overviewLink).toBeVisible();

        // Verify main content has NOT been pushed down
        const boxAfter = await mainContent.boundingBox();
        if (boxBefore && boxAfter) {
            expect(boxAfter.y).toBe(boxBefore.y);
        }

        // Capture screenshot of mobile menu overlay
        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_mobile_menu_overlay.png'
        });

        // Click escape to close
        await page.keyboard.press('Escape');
        await expect(overviewLink).toBeHidden();
    });
});
