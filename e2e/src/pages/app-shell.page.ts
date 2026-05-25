import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AppShellPage {
    readonly page: Page;
    readonly header;
    readonly footer;
    readonly syncIndicator;
    readonly resumeSessionBtn;

    constructor(page: Page) {
        this.page = page;
        this.header = page.locator('.app-header');
        this.footer = page.locator('footer');
        this.syncIndicator = page.locator('sync-indicator');
        this.resumeSessionBtn = page.getByRole('button', { name: /Resume Session/i });
    }

    /**
     * Navigate to a path and dismiss security overlay if active.
     */
    async navigateTo(path: string): Promise<void> {
        await this.page.goto(path);
        await this.page.waitForLoadState('domcontentloaded');
        await this.dismissSecurityOverlay();
    }

    /**
     * Wait for the app shell's header to be visible.
     */
    async waitForAppShell(): Promise<void> {
        await expect(this.header).toBeVisible({ timeout: 10_000 });
    }

    /**
     * Dismiss security overlays if visible.
     */
    async dismissSecurityOverlay(): Promise<void> {
        const isVisible = await this.resumeSessionBtn.isVisible().catch(() => false);
        if (isVisible) {
            await this.resumeSessionBtn.click({ force: true });
            await this.page.waitForTimeout(600);
        }
    }
}
