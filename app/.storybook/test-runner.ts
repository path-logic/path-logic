import type { TestRunnerConfig } from '@storybook/test-runner';
import {
    DefaultTerminalReporter,
    getViolations,
    injectAxe,
    reportViolations
} from 'axe-playwright';

const config: TestRunnerConfig = {
    async preVisit(page) {
        await injectAxe(page);
    },
    async postVisit(page, context) {
        // 1. Run Accessibility Audit
        try {
            const violations = await getViolations(page, '#storybook-root', {
                rules: {
                    // Ignore third-party PrimeNG internal ARIA role structures
                    'aria-required-children': { enabled: false },
                    // Ignore background contrast in isolated component story frames
                    'color-contrast': { enabled: false }
                }
            });

            if (violations.length > 0) {
                console.warn(
                    `[Accessibility Warning] ${violations.length} violation(s) in story ${context.id}:`
                );
                await reportViolations(violations, new DefaultTerminalReporter());
            }
        } catch (err) {
            console.warn(
                `[Accessibility Warning] Failed to run a11y audit in story ${context.id}:`,
                err
            );
        }

        // 2. Run Visual Screenshot Capture
        const screenshotPath = `dist/storybook-screenshots/${context.id}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
    }
};

export default config;
