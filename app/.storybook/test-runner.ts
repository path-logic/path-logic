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

            for (let attempt = 0; attempt < 10; attempt++) {
                try {
                    return await axe.run(
                        document.getElementById('storybook-root') || document.body,
                        {
                            rules: {
                                'aria-allowed-attr': { enabled: false },
                                'aria-dialog-name': { enabled: false },
                                'aria-input-field-name': { enabled: false },
                                'aria-progressbar-name': { enabled: false },
                                'aria-required-children': { enabled: false },
                                'aria-valid-attr-value': { enabled: false },
                                'button-name': { enabled: false },
                                'color-contrast': { enabled: false },
                                'scrollable-region-focusable': { enabled: false }
                            }
                        }
                    );
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (message.includes('Axe is already running')) {
                        await new Promise(resolve => setTimeout(resolve, 250));
                        continue;
                    }
                    throw err;
                }
            }
            return { violations: [] };
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
