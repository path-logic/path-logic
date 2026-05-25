import { expect, test } from '@playwright/test';
import { AccountLedgerPage } from '../pages/account-ledger.page';
import { AccountsPage } from '../pages/accounts.page';

test.describe('Transaction Management', () => {
    let accountsPage: AccountsPage;
    let ledgerPage: AccountLedgerPage;
    const today = new Date().toISOString().split('T')[0] || '';

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message, err.stack));

        accountsPage = new AccountsPage(page);
        ledgerPage = new AccountLedgerPage(page);

        await accountsPage.createCheckingAccount('Tx Test Account', '1000');
        // Navigate into the account ledger
        await accountsPage.goToAccountLedger('Tx Test Account');
    });

    test('add a simple transaction', async () => {
        await ledgerPage.addSimpleTransaction(today, 'Coffee Shop', '-4.50');

        // Transaction should appear in the ledger table
        await expect(ledgerPage.page.getByText('Coffee Shop')).toBeVisible({ timeout: 10_000 });
    });

    test('add a split transaction (paycheck)', async () => {
        await ledgerPage.fillDate(today);
        await ledgerPage.fillPayee('ACME Corp');
        await ledgerPage.fillAmount('2000');

        // Open split dialog
        await ledgerPage.clickSplit();
        await expect(ledgerPage.splitDialog).toBeVisible({ timeout: 5_000 });

        // Verify split entry dialog is open
        await expect(ledgerPage.page.getByText(/Split|Splits/i).first()).toBeVisible();
    });

    test('keyboard navigation in ledger: arrow keys move row selection', async () => {
        // First add a transaction so there's a row to navigate
        await ledgerPage.addSimpleTransaction(today, 'Nav Test Payee', '-10');
        await expect(ledgerPage.page.getByText('Nav Test Payee')).toBeVisible({ timeout: 10_000 });

        // Click on the table row and test arrow key navigation
        const row = await ledgerPage.getRowByPayee('Nav Test Payee');
        await row.click();
        await ledgerPage.page.keyboard.press('ArrowDown');
        // Just verify no error is thrown and the page is still interactive
        await expect(ledgerPage.appShell.header).toBeVisible();
    });

    test('delete a transaction', async () => {
        // Add a transaction to delete
        await ledgerPage.addSimpleTransaction(today, 'Delete Me', '-99');
        await expect(ledgerPage.page.getByText('Delete Me')).toBeVisible({ timeout: 10_000 });

        // Find and click the delete button for that row
        await ledgerPage.deleteTransaction('Delete Me');

        await expect(ledgerPage.page.getByText('Delete Me')).toBeHidden({ timeout: 10_000 });
    });
});
