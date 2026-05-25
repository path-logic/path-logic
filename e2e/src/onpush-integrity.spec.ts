import { expect, test } from '@playwright/test';

test.describe('OnPush Integrity', () => {
    test('dashboard renders financial overview heading', async ({ page }) => {
        await page.goto('/');

        // The dashboard heading contains "Financial Overview" — use the heading role
        // to distinguish from the nav link "Overview"
        await expect(page.getByRole('heading', { name: /Financial/ })).toBeVisible();
    });

    test('dashboard renders KPI cards with signal-driven data', async ({ page }) => {
        await page.goto('/');

        // KPI: Net Position card — scope to main content area
        await expect(page.getByRole('main').getByText('Net Position').first()).toBeVisible();

        // KPI: Cleared and Pending labels — scope to main content area
        await expect(page.getByRole('main').getByText('Cleared').first()).toBeVisible();
        await expect(page.getByRole('main').getByText('Pending').first()).toBeVisible();
    });

    test('dashboard renders projection chart', async ({ page }) => {
        await page.goto('/');

        // The projection chart component should render within the dashboard
        const chart = page.locator('projection-chart');
        await expect(chart).toBeVisible();
    });

    test('dashboard renders recent activity section', async ({ page }) => {
        await page.goto('/');

        // Recent Activity section heading
        await expect(page.getByText('Recent Activity')).toBeVisible();
    });

    test('dashboard renders My Accounts section', async ({ page }) => {
        await page.goto('/');

        // My Accounts heading
        await expect(page.getByText('My Accounts')).toBeVisible();
    });

    test('accounts page loads without errors', async ({ page }) => {
        await page.goto('/accounts');

        // The app-shell layout should render
        await expect(page.locator('shell')).toBeVisible();

        // Either the accounts list or the welcome wizard should be visible
        const accountsHeading = page.getByText('Accounts Management');
        const welcomeWizard = page.locator('welcome-wizard');

        const hasAccounts = await accountsHeading.isVisible().catch(() => false);
        const hasWizard = await welcomeWizard.isVisible().catch(() => false);

        // One of these must be true — the page rendered content
        expect(hasAccounts || hasWizard).toBeTruthy();
    });
});
