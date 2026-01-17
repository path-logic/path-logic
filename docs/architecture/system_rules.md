# System Architecture Rules

This document defines the core technical standards and coding conventions for the Path Logic project. All AI agents and developers must strictly adhere to these rules.

## 1. TypeScript Standards

### 1.1 Strict Explicit Typing

- **Variables**: All variable declarations must have explicit types. Do not rely on type inference for local variables.
- **Parameters**: All function and method parameters must have explicit types.
- **Return Types**: All functions and methods must have explicit return types.
- **Banned Types**: The use of `any` is strictly prohibited. Use `unknown` or specific interfaces/types instead.

### 1.2 Anonymous Objects & `satisfies`

- **Literal Objects**: When creating "anonymous objects" (object literals that are not explicitly typed via a variable declaration or function parameter), the `satisfies` operator should be used extensively to ensure correctness while preserving the specific literal type.
- **Configuration & Options**: Result objects, configuration literals, and transient data structures should use `satisfies` against their relevant interface.

## 2. Code Organization

- **Naming**: Use `I` prefix for interfaces (e.g., `ITransaction`).
- **Collections**: Use `Array<T>` syntax instead of `T[]`.
- **Enums**: Use `enum` for sets of related constants.

## 3. Data Integrity

- **Penny-Perfect Math**: Use integer-based math (cents) to avoid floating-point errors.
- **Invariants**: Explicitly validate business invariants (e.g., split sums) at the engine level.
