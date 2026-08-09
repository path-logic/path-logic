# Project Agent Rules

## 1. Test-Driven & Behavior-Driven Development (TDD/BDD)

- Always write failing unit specs (`*.spec.ts`) before writing or modifying core implementation code.
- Define user contracts and UI interactions using Storybook stories with `play` functions and Playwright E2E tests before completing feature requests.

## 2. Technical Alignment & Constructive Pushback

- Do not hesitate to push back on user design ideas or architectural proposals if they compromise security, local-first principles, or financial math accuracy. Offer clean, well-reasoned technical alternatives.

## 3. Deferred Linting & Formatting During Debugging

- While actively troubleshooting runtime errors or test failures, **do not waste cycles on linting (`npm run lint`) or code formatting (`npm run format`)**.
- Defer linting and formatting until the underlying logic is fixed and tests pass, then re-run test suites after formatting.

## 4. Structured JSON Output for Agentic Debugging

- When executing automated test suites (unit tests, storybook test-runner, Playwright e2e), always direct or configure test outputs to emit structured JSON reports (e.g. `--json`, `--outputFile`, or JSON reporters) whenever possible to facilitate efficient programmatic parsing and agentic debugging.

## 5. Mandatory Storybook Suite Creation for UI Components & Pages

- Whenever a new component, page, or UI feature is created, a **full Storybook story suite (`*.stories.ts`)** with interaction testing (`play` functions) and accessibility (a11y) checks MUST also be created for it.

## 6. Framework Awareness & Version-Matched Modern Standards

- Before modifying or generating code in any repository, inspect `package.json` (or build manifests) to identify exact frontend (FE) and backend (BE) frameworks and their active major versions.
- Strictly adhere to the modern standards and architectural patterns matching the project's specific framework versions (e.g. Angular 21 Signals, Model Signals `model()`, Resource APIs, `OnPush` change detection, PrimeNG native APIs). Do NOT use obsolete or deprecated patterns from legacy major versions.

## 7. Targeted Linting & Formatting Scope

- Only lint and format files that were actually created or modified during the current prompt/task (e.g. `npx eslint <modified_files>` or `npx prettier --write <modified_files>`), avoiding unnecessary repository-wide re-formatting churn on untouched files.

Reminder: Always run lint, typecheck, test, and format before proposing commits or pushes.
