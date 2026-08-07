# Project Agent Rules

## Test Reporting & Agentic Debugging

When executing automated test suites (unit tests, storybook test-runner, Playwright e2e), always direct or configure test outputs to emit structured JSON reports (e.g. `--json`, `--outputFile`, or JSON reporters) whenever possible to facilitate efficient programmatic parsing and agentic debugging.
