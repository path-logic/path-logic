import { expect, test } from '@playwright/test';
import { AccountsPage } from '../pages/accounts.page';
import { DashboardPage } from '../pages/dashboard.page';
import { WelcomeWizardPage } from '../pages/welcome-wizard.page';

test.describe('First-Run Flow', () => {
    test('cold start: app loads and shows empty dashboard', async ({ page }) => {
        const dashboardPage = new DashboardPage(page);
        await dashboardPage.navigateTo();
        await expect(dashboardPage.heading).toBeVisible();
    });

    test('welcome wizard: complete new account setup via stepper', async ({ page }) => {
        const dashboardPage = new DashboardPage(page);
        await dashboardPage.navigateTo();

        const welcomeWizard = new WelcomeWizardPage(page);
        if (await welcomeWizard.isVisible()) {
            await welcomeWizard.selectType('Checking');
            await welcomeWizard.fillDetails('My Checking', '500');
            await welcomeWizard.clickCreateAccountOnly();
            await expect(welcomeWizard.container).toBeHidden({ timeout: 10_000 });
        }
        await expect(dashboardPage.appShell.header).toBeVisible();
    });

    test('accounts page: create a checking account via dialog', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message, err.stack));
        const accountsPage = new AccountsPage(page);
        await accountsPage.createCheckingAccount('E2E Checking', '2500');
        await expect(page.getByText('E2E Checking')).toBeVisible({ timeout: 10_000 });
    });

    test('accounts page: create a loan account via dialog', async ({ page }) => {
        const accountsPage = new AccountsPage(page);
        await accountsPage.createLoanAccount('Car Loan', '15000', '5.5', '60', '300');
        await expect(page.getByText('Car Loan')).toBeVisible({ timeout: 10_000 });
    });
});
