import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Force compatibility library preload on Ubuntu 24.04 noble WSL2 to bypass dynamic loader reloc bug
process.env['LD_PRELOAD'] = path.join(__dirname, 'lib', 'libblkid.so.1');

// Disable SSL validation for local self-signed certificate pings
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'https://127.0.0.1:4201';

const getReporter = () => {
    if (process.env['CI']) {
        return 'line';
    }
    if (process.env['AGENT']) {
        return 'json';
    }
    return 'html';
};

const config: any = {
    testDir: './src',
    outputDir: '../dist/.playwright/e2e/test-results',
    reporter: getReporter(),
    timeout: 30000,
    fullyParallel: true,
    forbidOnly: !!process.env['CI'],
    retries: process.env['CI'] ? 2 : 0,
    use: {
        baseURL,
        ignoreHTTPSErrors: true,
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry'
    },
    webServer: {
        command: 'npx ng serve --configuration=e2e --port=4201 --host=127.0.0.1',
        url: 'https://127.0.0.1:4201',
        ignoreHTTPSErrors: true,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000, // Allow 2 min for Angular build + serve
        cwd: path.resolve(__dirname, '..'),
        env: {
            NG_CLI_ANALYTICS: 'false'
        }
    },
    projects: [
        {
            name: 'chrome',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    executablePath: path.join(
                        __dirname,
                        'chrome-extracted',
                        'opt',
                        'google',
                        'chrome',
                        'google-chrome'
                    )
                }
            }
        }
    ]
};

if (process.env['CI']) {
    config.workers = 1;
}

export default defineConfig(config);
