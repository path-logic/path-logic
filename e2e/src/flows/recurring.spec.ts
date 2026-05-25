import { expect, test } from '@playwright/test';
import { AccountsPage } from '../pages/accounts.page';
import { DashboardPage } from '../pages/dashboard.page';
import { RecurringPage } from '../pages/recurring.page';

test.describe('Recurring Schedules & Projection', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message, err.stack));
    });

    test('create a recurring schedule', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('Rent Account', '2000');

        const recurringPage = new RecurringPage(page);
        await recurringPage.createRecurringSchedule('Monthly Rent', '-1200', 'Rent Account');

        // Verify the schedule appears in the list
        await expect(recurringPage.page.getByText('Monthly Rent')).toBeVisible({ timeout: 10_000 });
    });

    test('projection chart updates after adding a recurring schedule', async ({ page }) => {
        // Set up an account first
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('Projection Account', '5000');

        // Go to recurring and add a schedule
        const recurringPage = new RecurringPage(page);
        await recurringPage.createRecurringSchedule('Salary', '3000', 'Projection Account');
        await expect(recurringPage.page.getByText('Salary')).toBeVisible({ timeout: 10_000 });

        // Navigate to dashboard and verify projection chart is rendered
        const dashboardPage = new DashboardPage(page);
        await dashboardPage.navigateTo();
        await expect(dashboardPage.projectionChart).toBeVisible({
            timeout: 10_000
        });
    });
});
