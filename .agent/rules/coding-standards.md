# Path Logic: Project Organization & Code Style

## Folder Structure

- **Subfolder Isolation**: Every Component and Service MUST exist within its own dedicated subfolder within its parent directory (e.g., `services/auth/auth.service.ts`, `components/layout/header/header.component.ts`).
- **File Separation**: Components MUST use separate files for their template (`.html`) and stylesheet (`.css`). Avoid inline templates or styles.

## Angular 2025 Standards

- **Standalone Components**: All components MUST be standalone. Modular Angular (`NgModule`) is deprecated in this project.
- **Signal-First State**:
    - Use Angular Signals for all internal state management.
    - Use `input()` for inputs instead of `@Input()`.
    - Use `output()` for outputs instead of `@Output()`.
    - Use `model()` for two-way bindings where appropriate.
    - Component views should ideally use signals directly to minimize change detection cycles.
    - **Routing & Data Resolvers**: Use `withComponentInputBinding()` in `provideRouter` to map route parameters, query parameters, and resolver data directly to component `input()` signals. This avoids manual subscription to `ActivatedRoute`.
- **Dependency Injection**: Use the `inject()` function for dependency injection. Constructor injection is prohibited.
- **Change Detection**:
    - All components MUST use `ChangeDetectionStrategy.OnPush`.
    - **Nuance & Exceptions**: Be aware that `OnPush` primarily tracks Signal updates and Reference changes for `@Input()`. Traditional attribute bindings (e.g., `[disabled]="expression"`) where `expression` is NOT a signal may not trigger a change detection check if the expression changes unless an event or signal also triggers the check. In these rare cases, ensure the expression is wrapped in a `computed` signal or manual `ChangeDetectorRef.markForCheck()` is used.
- **Component APIs**: Prefer `viewChild`, `contentChild`, etc. as Signal-based queries over decorators.

## TypeScript Patterns

- **Strict Typing**: Use fully detailed typing for all variables, properties, and return types.
- **`satisfies` Operator**: When defining object literals that should match an interface, use the `satisfies` operator (e.g., `const config = { ... } satisfies IConfig`).
- **Array Instantiation**: Always use the `new Array<T>(...)` pattern for creating arrays, except for `Array<number>` where the constructor behavior differs.

## Component Discovery

- **Docstrings**: Provide descriptive docstrings for components, services, and their public members to improve discoverability and maintainability.
- **Naming**: Use standard Angular naming conventions (e.g., `name.component.ts`, `name.service.ts`).
