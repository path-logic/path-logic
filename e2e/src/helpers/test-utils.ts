import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import * as path from 'path';
import { AccountsPage } from '../pages/accounts.page';
import { WelcomeWizardPage } from '../pages/welcome-wizard.page';

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
    await expect(page.locator('.app-header')).toBeVisible({ timeout: 10_000 });
}

/**
 * Open the "New Account" dialog from the Accounts page.
 */
export async function openNewAccountDialog(page: Page): Promise<void> {
    await navigateTo(page, '/accounts');
    await waitForAppShell(page);
    const loadingState = page.getByText(/Loading your data/i);
    await expect(loadingState).toBeHidden({ timeout: 15_000 });
    const addBtn = page.getByRole('button', { name: /New Account|Add Account/i });
    await addBtn.click();
    await expect(page.locator('.new-account-dialog')).toBeVisible({ timeout: 5_000 });
}

/**
 * Ensure that onboarding welcome wizard is completed if visible.
 */
export async function ensureOnboardingCompleted(page: Page): Promise<void> {
    const wizard = new WelcomeWizardPage(page);
    await wizard.completeOnboardingChecking('Initial Checking', '1000');
}

/**
 * Complete the New Account dialog for a checking account.
 */
export async function createCheckingAccount(
    page: Page,
    name: string,
    balance: string = '1000'
): Promise<void> {
    const accountsPage = new AccountsPage(page);
    await accountsPage.createCheckingAccount(name, balance);
}
