# TDD & BDD Development & Debugging Workflow

This workflow outlines the mandatory protocol for feature development, debugging, and technical collaboration in this repository.

---

## 1. Test-Driven Development (TDD) & Behavior-Driven Development (BDD)

- **TDD First**: Write failing unit specs (`*.spec.ts`) demonstrating expected behavior before writing or modifying core logic. Follow strict Red -> Green -> Refactor sequence.
- **BDD Scenarios**: Define user stories and interaction contracts using Storybook stories with `play` interaction functions and Playwright E2E tests.

---

## 2. Constructive Technical Alignment & Pushback

- Do not blindly execute requests that introduce security flaws, compromise penny-perfect financial calculation accuracy, or violate local-first architecture principles.
- Actively push back on sub-optimal design proposals or architectural regressions, providing clear technical rationale and recommended alternatives.

---

## 3. Defer Linting & Formatting During Debugging Loops

- **Do not run linting (`npm run lint`) or formatting (`npm run format`) while actively troubleshooting or debugging test/runtime failures.**
- Focus purely on diagnosing root causes, fixing underlying logic, and making tests pass.
- Save linting (`npm run lint`) and formatting (`npm run format`) for the final cleanup phase after logic is verified. Always re-run test suites after formatting.

---

## 4. Programmatic Agentic Debugging with JSON Outputs

- Always configure automated test runners (Vitest, Storybook test-runner, Playwright) to produce structured JSON report artifacts (e.g. `--json`, `--outputFile`, JSON reporters).
- Programmatically parse JSON test output to pinpoint precise failure locations, line numbers, and tracebacks without guessing.
