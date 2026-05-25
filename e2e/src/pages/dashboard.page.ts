import type { Page } from '@playwright/test';
import { AppShellPage } from './app-shell.page';

export class DashboardPage {
    readonly page: Page;
    readonly appShell: AppShellPage;

    readonly heading;
    readonly netPositionCard;
    readonly clearedBalanceLabel;
    readonly pendingBalanceLabel;
    readonly projectionChart;
    readonly recentActivityHeading;
    readonly myAccountsHeading;

    constructor(page: Page) {
        this.page = page;
        this.appShell = new AppShellPage(page);

        this.heading = page.getByRole('heading', { name: /Financial/ });
        this.netPositionCard = page.getByRole('main').getByText('Net Position').first();
        this.clearedBalanceLabel = page.getByRole('main').getByText('Cleared').first();
        this.pendingBalanceLabel = page.getByRole('main').getByText('Pending').first();
        this.projectionChart = page.locator('projection-chart');
        this.recentActivityHeading = page.getByText('Recent Activity');
        this.myAccountsHeading = page.getByText('My Accounts');
    }

    async navigateTo(): Promise<void> {
        const url = this.page.url();
        if (url.endsWith('/') || url.endsWith('/dashboard')) {
            return;
        }
        await this.appShell.navigateTo('/');
        await this.appShell.waitForAppShell();
    }
}
