import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

/**
 * See https://playwright.dev/docs/test-configuration.
 * CI Cache Bust: 2026-02-03
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : 4,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // channel: 'chrome',
                launchOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--test-type',
                        '--remote-debugging-port=9222',
                        '--incognito',
                        '--ignore-certificate-errors',
                    ],
                },
            },
        },
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !isCI,
    },
});
