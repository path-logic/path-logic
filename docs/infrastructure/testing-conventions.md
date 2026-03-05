# Browser Testing Conventions

To ensure stable, consistent, and debuggable UI testing, always adhere to the following conventions when configuring or launching browsers (Playwright, Puppeteer, or Manual).

## 1. Remote Debugging

Always launch tests with the remote debugging port enabled. This allows external tools and agents to hook into the browser session.

- **Port**: `9222`
- **Flag**: `--remote-debugging-port=9222`

## 2. Stability & Environment Flags

When running in CI or containerized environments (Docker), the following flags are mandatory to prevent crashes related to GPU or Shared Memory:

| Flag                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `--no-sandbox`             | Required for Docker/root environments.                      |
| `--disable-setuid-sandbox` | Security override for test stability.                       |
| `--disable-dev-shm-usage`  | Prevents crashes due to limited `/dev/shm` in containers.   |
| `--disable-gpu`            | Saves resources and avoids rendering bugs in headless mode. |

## 3. Clean Slate Testing

Always test as a "new user" to avoid cache/cookie interference:

- **Flag**: `--incognito`
- **Flag**: `--user-data-dir="/tmp/playwright-tests"` (or a unique temp dir)

## 4. Playwright Configuration

The project's `playwright.config.ts` is configured to use **Chrome for Testing** with the following baseline:

```typescript
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
}
```

## 5. Local Troubleshooting

If you need to bypass SSL errors for local development:
`--ignore-certificate-errors`
