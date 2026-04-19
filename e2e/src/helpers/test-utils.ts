import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import * as path from 'path';

export const FIXTURES_DIR = path.join(__dirname, '../fixtures');

/**
 * Dismiss the security overlay if it appears (idle timeout in headless mode).
 */
export async function dismissSecurityOverlay(page: Page): Promise<void> {
    const resumeBtn = page.getByRole('button', { name: /Resume Session/i });
    const isVisible = await resumeBtn.isVisible().catch(() => false);
    if (isVisible) {
        // Use force click because the button might be technically intercepted by the overlay wrapper
        await resumeBtn.click({ force: true });
        await page.waitForTimeout(600);
    }
}

/**
 * Navigate to a route and dismiss the security overlay if needed.
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');
    await dismissSecurityOverlay(page);
}

/**
 * Wait for the app shell to be fully rendered.
 */
export async function waitForAppShell(page: Page): Promise<void> {
    await expect(page.locator('app-header')).toBeVisible({ timeout: 10_000 });
}

/**
 * Open the "New Account" dialog from the Accounts page.
 */
export async function openNewAccountDialog(page: Page): Promise<void> {
    await navigateTo(page, '/accounts');
    await waitForAppShell(page);
    const addBtn = page.getByRole('button', { name: /New Account|Add Account/i });
    await addBtn.click();
    await expect(page.locator('p-dialog')).toBeVisible({ timeout: 5_000 });
}

/**
 * Complete the New Account dialog for a checking account.
 */
export async function createCheckingAccount(
    page: Page,
    name: string,
    balance: string = '1000'
): Promise<void> {
    await openNewAccountDialog(page);
    // Step 1: select account type
    await page.getByText('Checking').click();
    await page.getByRole('button', { name: /Next|Continue/i }).click();
    // Step 2: fill details
    await page.getByLabel(/Account Name/i).fill(name);
    await page.getByLabel(/Opening Balance/i).fill(balance);
    await page.getByRole('button', { name: /Create|Finish/i }).click();
    // Wait for dialog to close
    await expect(page.locator('p-dialog')).toBeHidden({ timeout: 10_000 });
}
