import { expect, test } from '@playwright/test';

test('debug navigation', async ({ page, baseURL }) => {
    console.log('DEBUG: BASE URL IS:', baseURL);
    if (!baseURL) {
        throw new Error('BASE_URL is undefined!');
    }
    await page.goto(baseURL);
    await expect(page).toHaveURL(new RegExp(baseURL));
    console.log('DEBUG: Navigation successful to', baseURL);
});
