import { expect, test } from '@playwright/test';

test.describe('Account Ledger Dark Mode Verification', () => {
    test.use({ colorScheme: 'dark' });

    test('Captures mobile dark mode', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        });
        await page.goto('/accounts/acc-mock-checking');
        await page.waitForLoadState('domcontentloaded');

        const resumeBtn = page.getByRole('button', { name: /Resume Session/i });
        if (await resumeBtn.isVisible()) {
            await resumeBtn.click();
        }

        const addBtn = page.getByRole('button', { name: /Add Transaction/i });
        await expect(addBtn).toBeVisible();

        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_mobile_dark.png'
        });

        await addBtn.click();
        const header = page.getByText(/New Transaction/i);
        await expect(header).toBeVisible();

        await page.screenshot({
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_mobile_sheet_dark.png'
        });
    });

    test('Captures tablet portrait dark mode', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        });
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
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_tablet_portrait_dark.png'
        });
    });

    test('Captures desktop dark mode', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        });
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
            path: '/home/pete/.gemini/antigravity-ide/brain/df0748fd-9a49-4dac-b228-7f8f7f068c7e/scratch/live_ledger_desktop_dark.png'
        });
    });
});
