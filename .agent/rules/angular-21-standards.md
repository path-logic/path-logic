# Antigravity Guide: High-Performance Angular 21 Development

## I. Structural Standards

1. **Modern Syntax Enforcement:**
    - **Reactivity**: Prioritize Signals (including `linkedSignal`) over `BehaviorSubject` for component state.
    - **Components**: Exclusively use Standalone Components; omit `NgModules`.
    - **Control Flow**: Use `@if`, `@for`, and `@switch` syntax.
    - **Change Detection**: Default to `OnPush` or Zoneless configurations.

2. **Data Fetching:**
    - Leverage the Angular 21 `resource()` and `rxResource()` APIs for asynchronous data operations within adapters, replacing traditional `HttpClient` subscription patterns in the UI layer.

## II. Hexagonal & Monorepo Governance

1. **Boundary Enforcement:**
    - The Domain layer must never import from the Infrastructure layer or directly from `@angular/common/http`.
    - Utilize the `@workspace` tag to help map dependencies across shared libraries and applications.

2. **Preventative Maintenance:**
    - Periodically scan for unused exports or legacy Observable patterns.
    - Use custom workflows (`/workflow-name`) for repetitive tasks like generating changelogs or running boundary checks.
