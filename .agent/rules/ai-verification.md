---
trigger: always_on
---

# AI Mandatory Verification Protocol

Before performing any `commit` and `push` actions, the AI agent MUST follow this exact verification sequence to ensure codebase integrity.

### 1. Static Analysis

Run the following to ensure no linting or typing regressions:

- `npm run lint` (or `make lint`)
- `npm run typecheck` (or `make typecheck`)

### 2. Testing

Run the full test suite, including unit, integration, and E2E (Playwright) tests:

- `npm run test` (or `make test`)

### 3. Formatting

Ensure all files adhere to the project's Prettier configuration:

- `npm run format` (or `make format`)

## Compliance

- **All steps must complete successfully.**
- If any step fails, the AI agent **MUST NOT** proceed with the commit. Fix the issues and re-run the entire verification sequence.
- Only after a clean pass is it permissible to generate a comprehensive commit message and perform the `git push`.
