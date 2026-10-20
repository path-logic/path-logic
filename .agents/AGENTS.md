# Project Agent Rules

## 1. Test-Driven & Behavior-Driven Development (TDD/BDD)

- Always follow strict TDD and BDD when planning and implementing any fix, feature, or refactor. Every new feature, UI workflow, or domain capability MUST include both failing unit specs (`*.spec.ts`) and a complete Storybook suite (`*.stories.ts`) before or during implementation.
- Require full verification across all dimensions:
    - **Unit & Integration**: Domain logic, math precision, stores, parsers, and API services.
    - **Storybook & Integration Testing**: Mandatory Storybook stories (`*.stories.ts` / `*.combo.stories.ts`) with interaction testing (`play` functions), paired with a headless Vitest spec (`*.stories.spec.ts`) for CI.
    - **Responsiveness & Theming**: Multi-viewport testing (Mobile 390px, Tablet 768px, Desktop 1280px+) across Light and Dark color schemes.
    - **E2E Smoke Testing**: Lean Playwright scenarios covering cold boot, persistence across reloads, and encryption.

## 2. Technical Alignment & Constructive Pushback

- Do not hesitate to push back on user design ideas or architectural proposals if they compromise security, local-first principles, or financial math accuracy. Offer clean, well-reasoned technical alternatives.

## 3. Deferred Linting & Formatting During Debugging

- While actively troubleshooting runtime errors or test failures, **do not waste cycles on linting (`npm run lint`) or code formatting (`npm run format`)**.
- Defer linting and formatting until the underlying logic is fixed and tests pass, then re-run test suites after formatting.

## 4. Structured JSON Output for Agentic Debugging

- When executing automated test suites (unit tests, storybook test-runner, Playwright e2e), always direct or configure test outputs to emit structured JSON reports (e.g. `--json`, `--outputFile`, or JSON reporters) whenever possible to facilitate efficient programmatic parsing and agentic debugging.
- **Playwright Testing**: Playwright test suites **MUST ALWAYS** be executed with `AGENT=1` (e.g. `AGENT=1 npx playwright test ...`). This activates the headless JSON reporter, preventing Playwright from blocking on interactive HTML report servers or terminal prompts.
- **UI & Functional Investigation**: Whenever necessary to investigate UI layout or functional aspects of the app, use Playwright with Chrome across appropriate viewports (Mobile 390px/412px, Tablet 768px/1024px, Desktop 1280px+) to inspect and validate behavior.

## 5. Mandatory Storybook Suite Creation for UI Components & Pages

- Whenever a new component, page, or UI feature is created, a **full Storybook story suite (`*.stories.ts`)** with interaction testing (`play` functions) and accessibility (a11y) checks MUST also be created for it.

## 6. Framework Awareness & Version-Matched Modern Standards

- Before modifying or generating code in any repository, inspect `package.json` (or build manifests) to identify exact frontend (FE) and backend (BE) frameworks and their active major versions.
- Strictly adhere to the modern standards and architectural patterns matching the project's specific framework versions (e.g. Angular 21 Signals, Model Signals `model()`, Resource APIs, `OnPush` change detection, PrimeNG native APIs). Do NOT use obsolete or deprecated patterns from legacy major versions.

## 7. Targeted Linting & Formatting Scope

- Only lint and format files that were actually created or modified during the current prompt/task (e.g. `npx eslint <modified_files>` or `npx prettier --write <modified_files>`), avoiding unnecessary repository-wide re-formatting churn on untouched files.

## 8. Port & Running Process Management

- Always check if an app or service that uses a port (e.g. Angular dev server on 4200/4201, Storybook on 6006) is already running before attempting to launch.
- If it is running, determine if it needs to be restarted (e.g. after config or dependency changes).
- If it needs to be restarted, restart it cleanly; otherwise, leave the current running instance alone and use it.

Reminder: Always run lint, typecheck, test, and format before proposing commits or pushes.
