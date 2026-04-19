import AxeBuilder from '@axe-core/playwright';
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('App UX Auditor', () => {
    test.beforeEach(async () => {
        // Ensure screenshots directory exists
        const dir = path.join(__dirname, '../../ux-screenshots');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const routes = ['/']; // We can expand this list later

    for (const route of routes) {
        test(`Audit Route: ${route}`, async ({ page }) => {
            await page.goto(route);

            // Wait for network idle or main content to load
            await page.waitForLoadState('domcontentloaded');

            // 1. Accessibility Scan
            const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

            // Log violations if any
            if (accessibilityScanResults.violations.length > 0) {
                console.warn(
                    `Accessibility violations on ${route}:`,
                    accessibilityScanResults.violations
                );
            }

            // 2. Touch Target Validator (Custom script injecting into the DOM)
            const smallTargets = await page.evaluate(() => {
                const interactables = Array.from(
                    document.querySelectorAll('button, a, [role="button"], input, select, textarea')
                );
                const violations: Array<Record<string, unknown>> = [];
                for (const el of interactables) {
                    const rect = el.getBoundingClientRect();
                    // Ignore invisible elements
                    if (rect.width === 0 || rect.height === 0) continue;

                    if (rect.width < 44 || rect.height < 44) {
                        violations.push({
                            tag: el.tagName,
                            text: el.textContent?.trim() || '',
                            className: el.className,
                            width: rect.width,
                            height: rect.height
                        });
                    }
                }
                return violations;
            });

            if (smallTargets.length > 0) {
                console.warn(
                    `Touch target violations on ${route} (less than 44x44px):`,
                    smallTargets
                );
            }

            // 3. Take a Visual Screenshot for AI Review
            const routeName = route === '/' ? 'home' : route.replace(/\//g, '-');
            const screenshotPath = path.join(
                __dirname,
                `../../ux-screenshots/${routeName}-desktop.png`
            );
            await page.screenshot({ path: screenshotPath, fullPage: true });

            // Extract styling
            const colorTokens = await page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                const bgColors = new Set<string>();
                const textColors = new Set<string>();
                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        bgColors.add(style.backgroundColor);
                    }
                    if (style.color) textColors.add(style.color);
                });
                return {
                    backgrounds: Array.from(bgColors),
                    textColors: Array.from(textColors)
                };
            });
            console.log(`Computed Colors for ${route}:`, colorTokens);

            // We temporarily don't enforce strict failure to let the AI see the screenshots first
            // expect(accessibilityScanResults.violations.length).toBe(0);
        });
    }
});
