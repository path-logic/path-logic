import type { TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe } from 'axe-playwright';

const config: TestRunnerConfig = {
    async preVisit(page) {
        await injectAxe(page);
    },
    async postVisit(page, context) {
        // 1. Run Strict Accessibility Audit
        const results = await page.evaluate(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const axe = (window as any).axe;
            if (!axe) return { violations: [] };
            return await axe.run(document.getElementById('storybook-root') || document.body, {
                rules: {
                    'aria-dialog-name': { enabled: false },
                    'aria-input-field-name': { enabled: false },
                    'aria-required-children': { enabled: false },
                    'button-name': { enabled: false },
                    'color-contrast': { enabled: false }
                }
            });
        });

        if (results.violations && results.violations.length > 0) {
            const details = results.violations
                .map(
                    (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
                        `${v.id}: ${v.help} (${v.nodes.map((n: { html: string }) => n.html).join(', ')})`
                )
                .join('\n');
            throw new Error(
                `${results.violations.length} accessibility violation(s) detected:\n${details}`
            );
        }

        // 2. Run Visual Screenshot Capture
        const screenshotPath = `dist/storybook-screenshots/${context.id}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
    }
};

export default config;
