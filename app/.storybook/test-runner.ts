import type { TestRunnerConfig } from '@storybook/test-runner';
import { checkA11y, injectAxe } from 'axe-playwright';

const config: TestRunnerConfig = {
    async preVisit(page) {
        await injectAxe(page);
    },
    async postVisit(page, context) {
        // 1. Run Accessibility Audit
        try {
            await checkA11y(page, '#storybook-root', {
                detailedReport: true,
                detailedReportOptions: { html: true }
            });
        } catch (err) {
            console.warn(`[Accessibility Warning] Violation in story ${context.id}:`, err);
        }

        // 2. Run Visual Screenshot Capture
        const screenshotPath = `dist/storybook-screenshots/${context.id}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
    }
};

export default config;
