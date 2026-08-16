import { expect, test } from '@playwright/test';

test.describe('Modern UI/UX & Command Palette Interactions', () => {
    test.beforeEach(async ({ page }) => {
        // Seed mock storage for an active session
        await page.addInitScript(() => {
            const mockAccounts = [
                {
                    id: 'acc-1',
                    name: 'Everyday Checking',
                    type: 'checking',
                    institutionName: 'Chase Bank',
                    currency: 'USD',
                    clearedBalance: 245000,
                    pendingBalance: 245000,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'acc-2',
                    name: 'High Yield Savings',
                    type: 'savings',
                    institutionName: 'Ally',
                    currency: 'USD',
                    clearedBalance: 1500000,
                    pendingBalance: 1500000,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];

            const mockTransactions = [
                {
                    id: 'tx-1',
                    accountId: 'acc-1',
                    payeeId: 'p-1',
                    date: '2026-08-15',
                    payee: "Trader Joe's",
                    memo: 'Weekly Groceries',
                    totalAmount: -8500,
                    status: 'pending',
                    splits: [{ id: 's-1', categoryId: null, memo: '', amount: -8500 }],
                    checkNumber: null,
                    importHash: 'hash-1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];

            const mockSession = {
                user: { uid: 'test-user', email: 'test@pathlogic.io', displayName: 'Test User' },
                token: 'mock-token'
            };

            window.localStorage.setItem('pathlogic_auth_session', JSON.stringify(mockSession));
            window.localStorage.setItem('pathlogic_accounts', JSON.stringify(mockAccounts));
            window.localStorage.setItem('pathlogic_transactions', JSON.stringify(mockTransactions));
        });
    });

    test('should open command palette via global keyboard shortcut Cmd+K / Ctrl+K', async ({
        page
    }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');

        // Press Ctrl+K
        await page.keyboard.press('Control+KeyK');
        const palette = page.getByRole('dialog', { name: /Command Palette/i });
        await expect(palette).toBeVisible();

        // Search for settings
        const searchInput = palette.getByPlaceholder(/Search views, accounts, actions/i);
        await searchInput.fill('Settings');
        await expect(palette.getByText('System Settings')).toBeVisible();

        // Press Escape to dismiss
        await page.keyboard.press('Escape');
        await expect(palette).toBeHidden();
    });

    test('should open command palette from header search trigger', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');

        const searchTrigger = page.getByRole('button', { name: /Open Command Palette/i }).first();
        await expect(searchTrigger).toBeVisible();
        await searchTrigger.click();

        const palette = page.getByRole('dialog', { name: /Command Palette/i });
        await expect(palette).toBeVisible();
    });

    test('should navigate to accounts page when clicking combined portfolio header', async ({
        page
    }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('domcontentloaded');

        const portfolioHeaderLink = page.getByRole('link', { name: /Account Portfolio/i });
        await expect(portfolioHeaderLink).toBeVisible();
        await portfolioHeaderLink.click();

        await expect(page).toHaveURL(/.*\/accounts/);
    });

    test('should verify sign-in page does not display technical scope footer text', async ({
        page
    }) => {
        await page.goto('/sign-in');
        await page.waitForLoadState('domcontentloaded');

        const button = page.getByRole('button', { name: /Continue with Google/i });
        await expect(button).toBeVisible();

        // Verify technical scope text is removed
        await expect(page.getByText(/appDataFolder scope only/i)).toBeHidden();
    });
});
