import { expect, test } from '@playwright/test';
import { dismissSecurityOverlay } from './helpers/test-utils';

test.describe('OnPush Integrity', () => {
    test.beforeEach(async ({ page }) => {
        // Clear potential idle timers or handle overlays
    });

    test('dashboard renders financial overview heading', async ({ page }) => {
        await page.goto('/');
        await dismissSecurityOverlay(page);

        // The dashboard heading contains "Portfolio Overview" — use the heading role
        // to distinguish from the nav link "Overview"
        await expect(
            page.getByRole('heading', { name: /Overview|Financial/i, level: 1 })
        ).toBeVisible();
    });

    test('dashboard renders forecast banner with signal-driven data', async ({ page }) => {
        await page.goto('/');
        await dismissSecurityOverlay(page);

        // Forecast section
        await expect(
            page.getByRole('heading', { name: /90-Day Cashflow Forecast/i, level: 2 })
        ).toBeVisible();
    });

    test('dashboard renders projection chart', async ({ page }) => {
        await page.goto('/');
        await dismissSecurityOverlay(page);

        // The projection chart component should render within the dashboard
        const chart = page.locator('projection-chart');
        await expect(chart).toBeVisible();
    });

    test('dashboard renders recent activity section', async ({ page }) => {
        await page.goto('/');
        await dismissSecurityOverlay(page);

        // Recent Activity section heading
        await expect(page.getByText('Recent Activity')).toBeVisible();
    });

    test('dashboard renders My Accounts section', async ({ page }) => {
        await page.goto('/');
        await dismissSecurityOverlay(page);

        // Account Portfolio heading
        await expect(page.getByText(/Account Portfolio|My Accounts/i)).toBeVisible();
    });

    test('accounts page loads without errors', async ({ page }) => {
        await page.goto('/accounts');
        await dismissSecurityOverlay(page);

        // The app-shell layout should render
        await expect(page.locator('shell')).toBeVisible();

        // Either the accounts list or the welcome wizard should be visible
        const accountsHeading = page.getByRole('heading', { name: /Accounts/i, level: 1 });
        const welcomeWizard = page.locator('welcome-wizard');

        await expect(accountsHeading.or(welcomeWizard)).toBeVisible({ timeout: 10_000 });
    });
});
